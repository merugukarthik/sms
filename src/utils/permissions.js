const toSlug = (value) => {
  if (typeof value !== 'string') return ''

  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const getCurrentUser = (authUser) => authUser?.user ?? authUser ?? {}

const getPermissionModules = (authUser) => {
  const currentUser = getCurrentUser(authUser)
  if (Array.isArray(currentUser?.permissions)) return currentUser.permissions
  if (Array.isArray(currentUser?.modules)) return currentUser.modules
  return []
}

const getFeatureList = (moduleItem) => (
  Array.isArray(moduleItem?.features)
    ? moduleItem.features
    : Array.isArray(moduleItem?.module_features)
      ? moduleItem.module_features
      : []
)

const matchesAny = (entity, matchers = [], mode = 'includes') => {
  if (!Array.isArray(matchers) || matchers.length === 0) return true

  const searchText = [
    entity?.module_name,
    entity?.feature_name,
    entity?.display_name,
    entity?.name,
    entity?.module_code,
    entity?.feature_code,
    entity?.code,
    entity?.slug,
  ]
    .map(toSlug)
    .filter(Boolean)

  return matchers.some((matcher) => {
    const normalizedMatcher = toSlug(matcher)
    if (!normalizedMatcher) return false
    return searchText.some((value) => {
      if (mode === 'exact') {
        return value === normalizedMatcher
      }

      return value === normalizedMatcher || value.includes(normalizedMatcher)
    })
  })
}

const getActionValues = (entity) => {
  const actionSources = [
    ...(Array.isArray(entity?.actions) ? entity.actions : []),
    ...(Array.isArray(entity?.permission) ? entity.permission : []),
    ...(Array.isArray(entity?.permissions) ? entity.permissions : []),
    ...(Array.isArray(entity?.feature_actions) ? entity.feature_actions : []),
    ...(Array.isArray(entity?.action_list) ? entity.action_list : []),
  ]

  return actionSources
    .map((actionItem) => {
      if (typeof actionItem === 'string') return toSlug(actionItem)

      return toSlug(
        actionItem?.id
          || actionItem?.name
          || actionItem?.display_name
          || actionItem?.action
          || actionItem?.value
          || actionItem?.code
          || '',
      )
    })
    .filter(Boolean)
}

const hasExplicitCrudFlags = (entity) => (
  ['can_create', 'can_read', 'can_update', 'can_delete'].some((key) => Object.prototype.hasOwnProperty.call(entity || {}, key))
)

const getCrudFlags = (entity) => {
  if (hasExplicitCrudFlags(entity)) {
    const canCreate = Boolean(entity?.can_create)
    const canRead = Boolean(entity?.can_read)
    const canUpdate = Boolean(entity?.can_update)
    const canDelete = Boolean(entity?.can_delete)

    return {
      canView: canRead || canCreate || canUpdate || canDelete,
      canCreate,
      canUpdate,
      canDelete,
    }
  }

  const actionValues = getActionValues(entity)
  const canCreate = actionValues.includes('add') || actionValues.includes('create')
  const canUpdate = actionValues.includes('edit') || actionValues.includes('update')
  const canDelete = actionValues.includes('delete') || actionValues.includes('remove')
  const canView = actionValues.length === 0
    ? true
    : actionValues.includes('view') || canCreate || canUpdate || canDelete

  return { canView, canCreate, canUpdate, canDelete }
}

const mergeCrudFlags = (current, next) => ({
  canView: Boolean(current.canView || next.canView),
  canCreate: Boolean(current.canCreate || next.canCreate),
  canUpdate: Boolean(current.canUpdate || next.canUpdate),
  canDelete: Boolean(current.canDelete || next.canDelete),
})

export const getCrudPermissions = (authUser, options = {}) => {
  const {
    moduleMatchers = [],
    featureMatchers = [],
    moduleMatchMode = 'includes',
    featureMatchMode = 'includes',
  } = options
  const modules = getPermissionModules(authUser)

  const defaultPermissions = {
    canView: true,
    canCreate: false,
    canUpdate: false,
    canDelete: false,
    canAdd: false,
    canEdit: false,
  }

  if (modules.length === 0) {
    return defaultPermissions
  }

  const matchingModules = modules.filter((moduleItem) => matchesAny(moduleItem, moduleMatchers, moduleMatchMode))
  if (matchingModules.length === 0) {
    return defaultPermissions
  }

  let permissions = { ...defaultPermissions }

  matchingModules.forEach((moduleItem) => {
    const featureList = getFeatureList(moduleItem)
    const matchingFeatures = featureList.filter((featureItem) => matchesAny(featureItem?.feature ?? featureItem, featureMatchers, featureMatchMode))

    if (matchingFeatures.length > 0) {
      matchingFeatures.forEach((featureItem) => {
        permissions = mergeCrudFlags(permissions, getCrudFlags(featureItem))
      })
      return
    }

    permissions = mergeCrudFlags(permissions, getCrudFlags(moduleItem))
  })

  return {
    ...permissions,
    canAdd: permissions.canCreate,
    canEdit: permissions.canUpdate,
  }
}
