import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  fetchAcademicYears,
  fetchClasses,
  fetchCreateAcademicYear,
  fetchCreateClass,
  fetchCreateSection,
  fetchDeleteAcademicYear,
  fetchDeleteClass,
  fetchDeleteSection,
  fetchSections,
  fetchUpdateAcademicYear,
  fetchUpdateClass,
  fetchUpdateSection,
} from '../store/academicSlice'
import CustomPopup from '../components/CustomPopup'
import CustomTable from '../components/CustomTable'

const TAB_KEYS = {
  ACADEMIC_YEARS: 'academic-years',
  CLASSES: 'classes',
  SECTIONS: 'sections',
}

const TAB_LABELS = {
  [TAB_KEYS.ACADEMIC_YEARS]: 'Academic Years',
  [TAB_KEYS.CLASSES]: 'Classes',
  [TAB_KEYS.SECTIONS]: 'Sections',
}

const TAB_ENTITY_LABELS = {
  [TAB_KEYS.ACADEMIC_YEARS]: 'Academic Year',
  [TAB_KEYS.CLASSES]: 'Class',
  [TAB_KEYS.SECTIONS]: 'Section',
}

const toSlug = (value) => {
  if (typeof value !== 'string') return ''
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const getFeatureSlug = (feature) => toSlug(
  feature?.name || feature?.display_name || feature?.feature_name || '',
)

const getFeatureActionValues = (feature) => {
  const actionSources = [
    ...(Array.isArray(feature?.actions) ? feature.actions : []),
    ...(Array.isArray(feature?.permission) ? feature.permission : []),
    ...(Array.isArray(feature?.permissions) ? feature.permissions : []),
    ...(Array.isArray(feature?.feature_actions) ? feature.feature_actions : []),
    ...(Array.isArray(feature?.action_list) ? feature.action_list : []),
  ]

  const actions = actionSources.length > 0 ? actionSources : (
    Array.isArray(feature?.feature?.actions) ? feature.feature.actions : []
  )

  return actions
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

const getPermissionsFromActions = (actionValues) => {
  if (!Array.isArray(actionValues) || actionValues.length === 0) {
    return {
      canView: true,
      canAdd: false,
      canEdit: false,
      canDelete: false,
    }
  }

  const canAdd = actionValues.includes('add') || actionValues.includes('create')
  const canEdit = actionValues.includes('edit') || actionValues.includes('update')
  const canDelete = actionValues.includes('delete') || actionValues.includes('remove')
  const canView = actionValues.includes('view') || canAdd || canEdit || canDelete
  return { canView, canAdd, canEdit, canDelete }
}

const getInitialFormData = (tab) => {
  if (tab === TAB_KEYS.ACADEMIC_YEARS) {
    return {
      name: '',
      academic_year: '',
      // start_date: '',
      // end_date: '',
      is_current: false,
    }
  }

  if (tab === TAB_KEYS.SECTIONS) {
    return {
      name: '',
      class_id: 0,
    }
  }

  return {
    name: '',
  }
}

const normalizeList = (resp) => (
  Array.isArray(resp?.items)
    ? resp.items
    : Array.isArray(resp)
      ? resp
      : Array.isArray(resp?.data)
        ? resp.data
        : []
)

const parseAcademicYearStart = (value) => {
  const text = String(value ?? '').trim()
  const match = text.match(/^(\d{4})-(\d{2})$/)
  if (!match) return null
  const startYear = Number(match[1])
  return Number.isInteger(startYear) ? startYear : null
}

const formatAcademicYear = (startYear) => {
  const endYearShort = String((startYear + 1) % 100).padStart(2, '0')
  return `${startYear}-${endYearShort}`
}

function AcademicsPage() {
  const dispatch = useDispatch()
  const { user } = useSelector((state) => state.auth)

  const [activeTab, setActiveTab] = useState(TAB_KEYS.ACADEMIC_YEARS)
  const [academicYears, setAcademicYears] = useState([])
  const [classesData, setClassesData] = useState([])
  const [sectionsData, setSectionsData] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCreatePopupOpen, setIsCreatePopupOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState({})
  const [message, setMessage] = useState('')
  const [formData, setFormData] = useState(getInitialFormData(TAB_KEYS.ACADEMIC_YEARS))
  const [editFormData, setEditFormData] = useState(getInitialFormData(TAB_KEYS.ACADEMIC_YEARS))
  const currentCalendarYear = new Date().getFullYear()
  const currentAcademicYearValue = formatAcademicYear(currentCalendarYear)
  const selectedAcademicStartYear = parseAcademicYearStart(formData.academic_year)
  const canDecrementAcademicYear = Number.isInteger(selectedAcademicStartYear) && selectedAcademicStartYear > currentCalendarYear
  const canIncrementAcademicYear = false

  const currentTabLabel = TAB_LABELS[activeTab]
  const currentEntityLabel = TAB_ENTITY_LABELS[activeTab]

  const tabPermissions = useMemo(() => {
    const defaultPermission = {
      canView: true,
      canAdd: false,
      canEdit: false,
      canDelete: false,
    }

    const modules = Array.isArray(user?.modules) ? user.modules : []
    const academicsModule = modules.find((moduleItem) => {
      const moduleSlug = toSlug(moduleItem?.name || moduleItem?.display_name || '')
      return moduleSlug === 'academics' || moduleSlug === 'academic' || moduleSlug.includes('academic')
    })

    if (!academicsModule) return defaultPermission

    const featureList = Array.isArray(academicsModule?.features)
      ? academicsModule.features
      : Array.isArray(academicsModule?.module_features)
        ? academicsModule.module_features
        : []

    const moduleActionValues = getFeatureActionValues(academicsModule)
    const moduleLevelPermissions = getPermissionsFromActions(moduleActionValues)

    // Priority 1: use module-level actions directly when provided by API.
    // Example:
    // actions: ["view"] -> read-only
    // actions: ["create","delete","update","view"] -> full action controls
    if (moduleActionValues.length > 0) {
      return moduleLevelPermissions
    }

    if (featureList.length === 0) {
      return moduleLevelPermissions
    }

    const targetFeature = featureList.find((featureItem) => {
      const slug = getFeatureSlug(featureItem)
      if (activeTab === TAB_KEYS.CLASSES) return slug.includes('class')
      if (activeTab === TAB_KEYS.SECTIONS) return slug.includes('section')
      return slug.includes('year') || slug.includes('academic-year')
    })

    if (targetFeature) {
      const featurePermissions = getPermissionsFromActions(getFeatureActionValues(targetFeature))
      if (featurePermissions.canAdd || featurePermissions.canEdit || featurePermissions.canDelete) {
        return featurePermissions
      }
    }

    // Fallback: combine all feature actions for academics module.
    const combinedFeatureActions = featureList.flatMap((featureItem) => getFeatureActionValues(featureItem))
    const combinedFeaturePermissions = getPermissionsFromActions(combinedFeatureActions)
    if (combinedFeaturePermissions.canAdd || combinedFeaturePermissions.canEdit || combinedFeaturePermissions.canDelete) {
      return combinedFeaturePermissions
    }

    if (combinedFeaturePermissions.canView) {
      return combinedFeaturePermissions
    }

    return moduleLevelPermissions
  }, [activeTab, user?.modules])
  const showActionColumn = tabPermissions.canAdd || tabPermissions.canEdit || tabPermissions.canDelete

  const currentTableData = useMemo(() => {
    if (activeTab === TAB_KEYS.CLASSES) return classesData
    if (activeTab === TAB_KEYS.SECTIONS) return sectionsData
    return academicYears
  }, [academicYears, activeTab, classesData, sectionsData])

  const refreshByTab = async (tab) => {
    if (!user?.access_token) return

    setIsLoading(true)
    setError('')
    try {
      if (tab === TAB_KEYS.CLASSES) {
        const resp = await dispatch(fetchClasses({ access_token: user.access_token })).unwrap()
        setClassesData(normalizeList(resp))
      } else if (tab === TAB_KEYS.SECTIONS) {
        const resp = await dispatch(fetchSections({ access_token: user.access_token })).unwrap()
        setSectionsData(normalizeList(resp))
      } else {
        const resp = await dispatch(fetchAcademicYears({ access_token: user.access_token })).unwrap()
        setAcademicYears(normalizeList(resp))
      }
    } catch (err) {
      setError(typeof err === 'string' ? err : `Failed to fetch ${currentTabLabel.toLowerCase()}.`)
      if (tab === TAB_KEYS.CLASSES) setClassesData([])
      if (tab === TAB_KEYS.SECTIONS) setSectionsData([])
      if (tab === TAB_KEYS.ACADEMIC_YEARS) setAcademicYears([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    refreshByTab(activeTab)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, user?.access_token, activeTab])

  useEffect(() => {
    setIsCreatePopupOpen(false)
    setEditingItem(null)
    setDeleteTarget(null)
    setFormError({})
    setFormData(getInitialFormData(activeTab))
    setEditFormData(getInitialFormData(activeTab))
  }, [activeTab])

  const validateForm = (tab, values) => {
    const nextErrors = {}
    if (tab === TAB_KEYS.ACADEMIC_YEARS) {
      if (!values.name?.trim()) nextErrors.name = 'Name is required.'
      if (!String(values.academic_year ?? '').trim()) nextErrors.academic_year = 'Academic year is required.'
    } else if (!values.name?.trim()) {
      nextErrors.name = 'Name is required.'
    }

    // if (tab === TAB_KEYS.ACADEMIC_YEARS) {
    //   if (!values.start_date) nextErrors.start_date = 'Start date is required.'
    //   if (!values.end_date) nextErrors.end_date = 'End date is required.'
    // }

    if (tab === TAB_KEYS.SECTIONS) {
      if (!values.class_id || Number(values.class_id) <= 0) {
        nextErrors.class_id = 'Class id is required.'
      }
    }

    return nextErrors
  }

  const openCreatePopup = () => {
    setIsCreatePopupOpen(true)
    setFormError({})
    setMessage('')
    if (activeTab === TAB_KEYS.ACADEMIC_YEARS) {
      setFormData({
        ...getInitialFormData(activeTab),
        academic_year: currentAcademicYearValue,
      })
      return
    }
    setFormData(getInitialFormData(activeTab))
  }

  const closeCreatePopup = () => {
    setIsCreatePopupOpen(false)
    setFormData(getInitialFormData(activeTab))
    setFormError({})
  }

  const closeEditPopup = () => {
    setEditingItem(null)
    setEditFormData(getInitialFormData(activeTab))
    setFormError({})
  }

  const handleInputChange = (event) => {
    const { name, value, type, checked } = event.target
    const nextValue = activeTab === TAB_KEYS.ACADEMIC_YEARS && name === 'academic_year'
      ? currentAcademicYearValue
      : type === 'checkbox'
        ? checked
        : type === 'number'
          ? Number(value)
          : value

    setFormData((prev) => ({
      ...prev,
      [name]: nextValue,
    }))
    setFormError((prev) => ({ ...prev, [name]: '', submit: '' }))
  }

  const handleEditInputChange = (event) => {
    const { name, value, type, checked } = event.target
    setEditFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? Number(value) : value,
    }))
    setFormError((prev) => ({ ...prev, [name]: '', editSubmit: '' }))
  }

  const handleSetNextAcademicYear = () => {
    if (!canIncrementAcademicYear) return

    const currentYear = currentCalendarYear
    const currentStart = parseAcademicYearStart(formData.academic_year)
    const safeStartYear = Number.isInteger(currentStart) ? Math.max(currentStart, currentYear) : currentYear
    const nextStartYear = safeStartYear + 1
    setFormData((prev) => ({
      ...prev,
      academic_year: formatAcademicYear(nextStartYear),
    }))
    setFormError((prev) => ({
      ...prev,
      academic_year: '',
      submit: '',
    }))
  }

  const handleSetPreviousAcademicYear = () => {
    if (activeTab === TAB_KEYS.ACADEMIC_YEARS) return

    const currentYear = currentCalendarYear
    const currentStart = parseAcademicYearStart(formData.academic_year)
    const safeStartYear = Number.isInteger(currentStart) ? Math.max(currentStart, currentYear) : currentYear
    const prevStartYear = Math.max(safeStartYear - 1, currentYear)
    setFormData((prev) => ({
      ...prev,
      academic_year: formatAcademicYear(prevStartYear),
    }))
    setFormError((prev) => ({
      ...prev,
      academic_year: '',
      submit: '',
    }))
  }

  const handleCreate = async (event) => {
    event.preventDefault()
    console.log('academic form data:- ',formData)
    const validationErrors = validateForm(activeTab, formData)
    if (Object.keys(validationErrors).length > 0) {
      setFormError(validationErrors)
      return
    }

    if (!user?.access_token) {
      setFormError({ submit: 'Missing access token. Please login again.' })
      return
    }

    setIsSubmitting(true)
    try {
      if (activeTab === TAB_KEYS.CLASSES) {
        await dispatch(fetchCreateClass({ name: formData.name, access_token: user.access_token })).unwrap()
      } else if (activeTab === TAB_KEYS.SECTIONS) {
        await dispatch(
          fetchCreateSection({
            name: formData.name,
            class_id: formData.class_id,
            access_token: user.access_token,
          }),
        ).unwrap()
      } else {
        await dispatch(
          fetchCreateAcademicYear({
            name: formData.name,
            academic_year: currentAcademicYearValue,
            // start_date: formData.start_date,
            // end_date: formData.end_date,
            is_current: Boolean(formData.is_current),
            access_token: user.access_token,
          }),
        ).unwrap()
      }

      setMessage(`${currentEntityLabel} created successfully.`)
      closeCreatePopup()
      await refreshByTab(activeTab)
    } catch (err) {
      setFormError({
        submit: typeof err === 'string' ? err : `Failed to create ${currentEntityLabel.toLowerCase()}.`,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenEdit = (item) => {
    setEditingItem(item)
    if (activeTab === TAB_KEYS.ACADEMIC_YEARS) {
      setEditFormData({
        name: item?.name || '',
        academic_year:item?.academic_year || '',
        // start_date: item?.start_date || '',
        // end_date: item?.end_date || '',
        is_current: Boolean(item?.is_current),
      })
    } else if (activeTab === TAB_KEYS.SECTIONS) {
      setEditFormData({
        name: item?.name || '',
        class_id: Number(item?.class_id ?? 0),
      })
    } else {
      setEditFormData({
        name: item?.name || '',
      })
    }
    setFormError({})
    setMessage('')
  }

  const handleUpdate = async (event) => {
    event.preventDefault()
    const validationErrors = validateForm(activeTab, editFormData)
    if (Object.keys(validationErrors).length > 0) {
      setFormError(validationErrors)
      return
    }

    if (!editingItem?.id || !user?.access_token) {
      setFormError((prev) => ({ ...prev, editSubmit: `Unable to update ${currentEntityLabel.toLowerCase()}.` }))
      return
    }

    setIsSubmitting(true)
    try {
      if (activeTab === TAB_KEYS.CLASSES) {
        await dispatch(
          fetchUpdateClass({
            id: editingItem.id,
            name: editFormData.name,
            access_token: user.access_token,
          }),
        ).unwrap()
      } else if (activeTab === TAB_KEYS.SECTIONS) {
        await dispatch(
          fetchUpdateSection({
            id: editingItem.id,
            name: editFormData.name,
            class_id: editFormData.class_id,
            access_token: user.access_token,
          }),
        ).unwrap()
      } else {
        await dispatch(
          fetchUpdateAcademicYear({
            id: editingItem.id,
            name: editFormData.name,
            academic_year:editFormData.academic_year,
            // start_date: editFormData.start_date,
            // end_date: editFormData.end_date,
            is_current: Boolean(editFormData.is_current),
            access_token: user.access_token,
          }),
        ).unwrap()
      }

      closeEditPopup()
      await refreshByTab(activeTab)
      setMessage(`${currentEntityLabel} updated successfully.`)
    } catch (err) {
      setFormError((prev) => ({
        ...prev,
        editSubmit: typeof err === 'string' ? err : `Failed to update ${currentEntityLabel.toLowerCase()}.`,
      }))
    } finally {
      setIsSubmitting(false)
    }
  }

  const requestDelete = (item) => {
    setDeleteTarget(item)
  }

  const closeDeletePopup = () => {
    setDeleteTarget(null)
  }

  const handleDelete = async () => {
    const id = deleteTarget?.id
    if (!user?.access_token || !id) return
    if (actionLoadingId === String(id)) return

    setActionLoadingId(String(id))
    setMessage('')
    try {
      if (activeTab === TAB_KEYS.CLASSES) {
        await dispatch(fetchDeleteClass({ id, access_token: user.access_token })).unwrap()
      } else if (activeTab === TAB_KEYS.SECTIONS) {
        await dispatch(fetchDeleteSection({ id, access_token: user.access_token })).unwrap()
      } else {
        await dispatch(fetchDeleteAcademicYear({ id, access_token: user.access_token })).unwrap()
      }

      closeDeletePopup()
      await refreshByTab(activeTab)
      setMessage(`${currentEntityLabel} deleted successfully.`)
    } catch (err) {
      setFormError({
        submit: typeof err === 'string' ? err : `Failed to delete ${currentEntityLabel.toLowerCase()}.`,
      })
    } finally {
      setActionLoadingId('')
    }
  }

  const columns = useMemo(() => {
    if (activeTab === TAB_KEYS.CLASSES) {
      const classColumns = [
        { key: 'id', header: 'Class Id' },
        { key: 'name', header: 'Name' },
      ]

      if (showActionColumn) {
        classColumns.push({
          key: 'action',
          header: 'Action',
          render: (item) => (
            <div className="role-management-table-actions">
              {tabPermissions.canEdit && (
                <button
                  type="button"
                  className="role-management-action-btn role-management-action-btn-edit"
                  onClick={() => handleOpenEdit(item)}
                >
                  Edit
                </button>
              )}
              {tabPermissions.canDelete && (
                <button
                  type="button"
                  className="role-management-action-btn role-management-action-btn-delete"
                  onClick={() => requestDelete(item)}
                  disabled={actionLoadingId === String(item?.id)}
                >
                  {actionLoadingId === String(item?.id) ? 'Deleting...' : 'Delete'}
                </button>
              )}
              {!tabPermissions.canEdit && !tabPermissions.canDelete && <span>-</span>}
            </div>
          ),
        })
      }

      return classColumns
    }

    if (activeTab === TAB_KEYS.SECTIONS) {
      const sectionColumns = [
        { key: 'id', header: 'Section Id' },
        { key: 'name', header: 'Name' },
        { key: 'class_name', header: 'Class' },
        { key: 'class_id', header: 'Class Id' },
      ]

      if (showActionColumn) {
        sectionColumns.push({
          key: 'action',
          header: 'Action',
          render: (item) => (
            <div className="role-management-table-actions">
              {tabPermissions.canEdit && (
                <button
                  type="button"
                  className="role-management-action-btn role-management-action-btn-edit"
                  onClick={() => handleOpenEdit(item)}
                >
                  Edit
                </button>
              )}
              {tabPermissions.canDelete && (
                <button
                  type="button"
                  className="role-management-action-btn role-management-action-btn-delete"
                  onClick={() => requestDelete(item)}
                  disabled={actionLoadingId === String(item?.id)}
                >
                  {actionLoadingId === String(item?.id) ? 'Deleting...' : 'Delete'}
                </button>
              )}
              {!tabPermissions.canEdit && !tabPermissions.canDelete && <span>-</span>}
            </div>
          ),
        })
      }

      return sectionColumns
    }

    const yearColumns = [
      { key: 'id', header: 'Year Id' },
      { key: 'name', header: 'Name' },
        { key: 'academic_year', header: 'Academic Year' },
      // { key: 'start_date', header: 'Start Date' },
      // { key: 'end_date', header: 'End Date' },
      {
        key: 'is_current',
        header: 'Is Current',
        render: (item) => (item?.is_current ? 'Yes' : 'No'),
      },
    ]

    if (showActionColumn) {
      yearColumns.push({
        key: 'action',
        header: 'Action',
        render: (item) => (
          <div className="role-management-table-actions">
            {tabPermissions.canEdit && (
              <button
                type="button"
                className="role-management-action-btn role-management-action-btn-edit"
                onClick={() => handleOpenEdit(item)}
              >
                Edit
              </button>
            )}
            {tabPermissions.canDelete && (
              <button
                type="button"
                className="role-management-action-btn role-management-action-btn-delete"
                onClick={() => requestDelete(item)}
                disabled={actionLoadingId === String(item?.id)}
              >
                {actionLoadingId === String(item?.id) ? 'Deleting...' : 'Delete'}
              </button>
            )}
            {!tabPermissions.canEdit && !tabPermissions.canDelete && <span>-</span>}
          </div>
        ),
      })
    }

    return yearColumns
  }, [activeTab, actionLoadingId, showActionColumn, tabPermissions.canDelete, tabPermissions.canEdit])

  return (
    <section className="role-management-wrap">
      <div className="role-management-card">
        <div className="role-management-head">
          <div className="role-management-head-row">
            <h2 className="role-management-title">{currentTabLabel}</h2>
            {tabPermissions.canAdd && (
              <button
                type="button"
                className="role-management-open-create-btn"
                onClick={openCreatePopup}
              >
                {`Create ${currentEntityLabel}`}
              </button>
            )}
          </div>
        </div>

        <div className="role-management-tabs">
          <button
            type="button"
            className={`role-management-tab-btn ${activeTab === TAB_KEYS.ACADEMIC_YEARS ? 'role-management-tab-btn-active' : ''}`}
            onClick={() => setActiveTab(TAB_KEYS.ACADEMIC_YEARS)}
          >
            Academic Year
          </button>
          <button
            type="button"
            className={`role-management-tab-btn ${activeTab === TAB_KEYS.CLASSES ? 'role-management-tab-btn-active' : ''}`}
            onClick={() => setActiveTab(TAB_KEYS.CLASSES)}
          >
            Classes
          </button>
          <button
            type="button"
            className={`role-management-tab-btn ${activeTab === TAB_KEYS.SECTIONS ? 'role-management-tab-btn-active' : ''}`}
            onClick={() => setActiveTab(TAB_KEYS.SECTIONS)}
          >
            Sections
          </button>
        </div>

        {isLoading && <p className="role-management-info">{`Loading ${currentTabLabel.toLowerCase()}...`}</p>}
        {error && <p className="role-management-error">{error}</p>}
        {!isLoading && !error && tabPermissions.canView && currentTableData.length === 0 && (
          <p className="role-management-info">{`No ${currentTabLabel.toLowerCase()} available.`}</p>
        )}

        {!isLoading && !error && tabPermissions.canView && currentTableData.length > 0 && (
          <CustomTable
            columns={columns}
            data={currentTableData}
            rowKey={(item, index) => item?.id ?? index}
            wrapperClassName="role-management-table-wrap"
            tableClassName="role-management-table"
            emptyMessage={`No ${currentTabLabel.toLowerCase()} available.`}
          />
        )}

        {!isLoading && !error && !tabPermissions.canView && (
          <p className="role-management-error">You do not have view permission for this feature.</p>
        )}

        {formError.submit && <p className="role-management-field-error">{formError.submit}</p>}
        {message && <p className="role-management-success">{message}</p>}
      </div>

      {isCreatePopupOpen && tabPermissions.canAdd && (
        <div className="custom-popup-backdrop" role="presentation">
          <div
            className="custom-popup role-management-create-popup"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-academic-tab-title"
          >
            <h3 id="create-academic-tab-title" className="custom-popup-title">{`Create ${currentEntityLabel}`}</h3>
            <form className="role-management-form" onSubmit={handleCreate}>
              <div className="role-management-field">
                <label htmlFor="academic-common-name" className="role-management-label">Name</label>
                <input
                  id="academic-common-name"
                  name="name"
                  type="text"
                  className="role-management-input"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter name"
                />
                {formError.name && <p className="role-management-field-error">{formError.name}</p>}
              </div>

              {activeTab === TAB_KEYS.ACADEMIC_YEARS && (
                <>
                  <div className="role-management-field">
                    <label htmlFor="academic-year-input" className="role-management-label">Academic Year</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        id="academic-year-input"
                        name="academic_year"
                        type="text"
                        className="role-management-input"
                        value={formData.academic_year}
                        onChange={handleInputChange}
                        readOnly
                        placeholder="YYYY-YY (e.g. 2026-27)"
                      />
                      <button
                        type="button"
                        className="role-management-action-btn role-management-action-btn-edit"
                        onClick={handleSetPreviousAcademicYear}
                        disabled={!canDecrementAcademicYear}
                        aria-label="Set previous year"
                        title={canDecrementAcademicYear ? 'Set previous year' : 'Previous year is disabled at current year'}
                      >
                        -
                      </button>
                      <button
                        type="button"
                        className="role-management-action-btn role-management-action-btn-edit"
                        onClick={handleSetNextAcademicYear}
                        disabled={!canIncrementAcademicYear}
                        aria-label="Set next year"
                        title={canIncrementAcademicYear ? 'Set next year' : 'Next year is disabled at second year'}
                      >
                        +
                      </button>
                    </div>
                    {formError.academic_year && <p className="role-management-field-error">{formError.academic_year}</p>}
                  </div>

                  {/* <div className="role-management-field">
                    <label htmlFor="academic-start_date" className="role-management-label">Start Date</label>
                    <input
                      id="academic-start_date"
                      name="start_date"
                      type="date"
                      className="role-management-input"
                      value={formData.start_date}
                      onChange={handleInputChange}
                    />
                    {formError.start_date && <p className="role-management-field-error">{formError.start_date}</p>}
                  </div>

                  <div className="role-management-field">
                    <label htmlFor="academic-end_date" className="role-management-label">End Date</label>
                    <input
                      id="academic-end_date"
                      name="end_date"
                      type="date"
                      className="role-management-input"
                      value={formData.end_date}
                      onChange={handleInputChange}
                    />
                    {formError.end_date && <p className="role-management-field-error">{formError.end_date}</p>}
                  </div> */}

                  <div className="role-management-field">
                    <label htmlFor="academic-is_current" className="role-management-label">
                      <input
                        id="academic-is_current"
                        name="is_current"
                        type="checkbox"
                        checked={Boolean(formData.is_current)}
                        onChange={handleInputChange}
                      />
                      {' '}
                      Is Current
                    </label>
                  </div>
                </>
              )}

              {activeTab === TAB_KEYS.SECTIONS && (
                <div className="role-management-field">
                  <label htmlFor="academic-class_id" className="role-management-label">Class Id</label>
                  <input
                    id="academic-class_id"
                    name="class_id"
                    type="number"
                    className="role-management-input"
                    value={formData.class_id}
                    onChange={handleInputChange}
                  />
                  {formError.class_id && <p className="role-management-field-error">{formError.class_id}</p>}
                </div>
              )}

              <div className="role-management-form-actions">
                <button type="submit" className="role-management-create-btn" disabled={isSubmitting}>
                  {isSubmitting ? 'Please wait...' : `Create ${currentEntityLabel}`}
                </button>
                <button
                  type="button"
                  className="role-management-cancel-btn"
                  onClick={closeCreatePopup}
                >
                  Cancel
                </button>
              </div>
              {formError.submit && <p className="role-management-field-error">{formError.submit}</p>}
            </form>
          </div>
        </div>
      )}

      {editingItem && (
        <div className="custom-popup-backdrop" role="presentation">
          <div
            className="custom-popup role-management-edit-popup"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-academic-tab-title"
          >
            <h3 id="edit-academic-tab-title" className="custom-popup-title">{`Edit ${currentEntityLabel}`}</h3>
            <form className="role-management-form" onSubmit={handleUpdate}>
              <div className="role-management-field">
                <label htmlFor="edit-academic-common-name" className="role-management-label">Name</label>
                <input
                  id="edit-academic-common-name"
                  name="name"
                  type="text"
                  className="role-management-input"
                  value={editFormData.name}
                  onChange={handleEditInputChange}
                  placeholder="Enter name"
                />
                {formError.name && <p className="role-management-field-error">{formError.name}</p>}
              </div>

              {activeTab === TAB_KEYS.ACADEMIC_YEARS && (
                <>
                
                 <div className="role-management-field">
                    <label htmlFor="academic-year-input" className="role-management-label">Academic Year</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        id="academic-year-input"
                        name="academic_year"
                        type="text"
                        className="role-management-input"
                        value={editFormData.academic_year}
                        onChange={handleInputChange}
                        readOnly
                        placeholder="YYYY-YY (e.g. 2026-27)"
                      />
                      <button
                        type="button"
                        className="role-management-action-btn role-management-action-btn-edit"
                        onClick={handleSetPreviousAcademicYear}
                        disabled={!canDecrementAcademicYear}
                        aria-label="Set previous year"
                        title={canDecrementAcademicYear ? 'Set previous year' : 'Previous year is disabled at current year'}
                      >
                        -
                      </button>
                      <button
                        type="button"
                        className="role-management-action-btn role-management-action-btn-edit"
                        onClick={handleSetNextAcademicYear}
                        disabled={!canIncrementAcademicYear}
                        aria-label="Set next year"
                        title={canIncrementAcademicYear ? 'Set next year' : 'Next year is disabled at second year'}
                      >
                        +
                      </button>
                    </div>
                    {formError.academic_year && <p className="role-management-field-error">{formError.academic_year}</p>}
                  </div>
                  {/* <div className="role-management-field">
                    <label htmlFor="edit-academic-start_date" className="role-management-label">Start Date</label>
                    <input
                      id="edit-academic-start_date"
                      name="start_date"
                      type="date"
                      className="role-management-input"
                      value={editFormData.start_date}
                      onChange={handleEditInputChange}
                    />
                    {formError.start_date && <p className="role-management-field-error">{formError.start_date}</p>}
                  </div>

                  <div className="role-management-field">
                    <label htmlFor="edit-academic-end_date" className="role-management-label">End Date</label>
                    <input
                      id="edit-academic-end_date"
                      name="end_date"
                      type="date"
                      className="role-management-input"
                      value={editFormData.end_date}
                      onChange={handleEditInputChange}
                    />
                    {formError.end_date && <p className="role-management-field-error">{formError.end_date}</p>}
                  </div> */}

                  <div className="role-management-field">
                    <label htmlFor="edit-academic-is_current" className="role-management-label">
                      <input
                        id="edit-academic-is_current"
                        name="is_current"
                        type="checkbox"
                        checked={Boolean(editFormData.is_current)}
                        onChange={handleEditInputChange}
                      />
                      {' '}
                      Is Current
                    </label>
                  </div>
                </>
              )}

              {activeTab === TAB_KEYS.SECTIONS && (
                <div className="role-management-field">
                  <label htmlFor="edit-academic-class_id" className="role-management-label">Class Id</label>
                  <input
                    id="edit-academic-class_id"
                    name="class_id"
                    type="number"
                    className="role-management-input"
                    value={editFormData.class_id}
                    onChange={handleEditInputChange}
                  />
                  {formError.class_id && <p className="role-management-field-error">{formError.class_id}</p>}
                </div>
              )}

              <div className="role-management-form-actions">
                <button type="submit" className="role-management-create-btn" disabled={isSubmitting}>
                  {isSubmitting ? 'Please wait...' : `Update ${currentEntityLabel}`}
                </button>
                <button
                  type="button"
                  className="role-management-cancel-btn"
                  onClick={closeEditPopup}
                >
                  Cancel
                </button>
              </div>
              {formError.editSubmit && <p className="role-management-field-error">{formError.editSubmit}</p>}
            </form>
          </div>
        </div>
      )}

      <CustomPopup
        isOpen={Boolean(deleteTarget)}
        title={`Delete ${currentEntityLabel}`}
        message={`Are you sure you want to delete "${deleteTarget?.name || `this ${currentEntityLabel.toLowerCase()}`}"?`}
        onConfirm={handleDelete}
        confirmText={actionLoadingId === String(deleteTarget?.id) ? 'Deleting...' : 'Delete'}
        onCancel={closeDeletePopup}
        cancelText="Cancel"
        showCancel
        isDanger
        titleId="delete-academic-tab-title"
      />
    </section>
  )
}

export default AcademicsPage
