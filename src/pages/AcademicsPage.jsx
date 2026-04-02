import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { DeleteActionIcon, EditActionIcon } from '../components/ActionIcons'
import {
  fetchAcademicYears,
  fetchClasses,
  fetchCreateAcademicYear,
  fetchCreateClass,
  fetchCreateExam,
  fetchCreateSection,
  fetchCreateSubject,
  fetchDeleteAcademicYear,
  fetchDeleteClass,
  fetchDeleteExam,
  fetchDeleteSection,
  fetchDeleteSubject,
  fetchExams,
  fetchSections,
  fetchSubjects,
  fetchUpdateAcademicYear,
  fetchUpdateClass,
  fetchUpdateExam,
  fetchUpdateSection,
  fetchUpdateSubject,
} from '../store/academicSlice'
import { fetchSchools } from '../store/schoolsSlice'
import CustomPopup from '../components/CustomPopup'
import CustomTable from '../components/CustomTable'
import { getCrudPermissions } from '../utils/permissions'

const TAB_KEYS = {
  ACADEMIC_YEARS: 'academic-years',
  CLASSES: 'classes',
  SECTIONS: 'sections',
  SUBJECTS: 'subjects',
  EXAMS: 'exams',
}

const TAB_LABELS = {
  [TAB_KEYS.ACADEMIC_YEARS]: 'Academic Years',
  [TAB_KEYS.CLASSES]: 'Classes',
  [TAB_KEYS.SECTIONS]: 'Sections',
  [TAB_KEYS.SUBJECTS]: 'Subjects',
  [TAB_KEYS.EXAMS]: 'Exams',
}

const TAB_ENTITY_LABELS = {
  [TAB_KEYS.ACADEMIC_YEARS]: 'Academic Year',
  [TAB_KEYS.CLASSES]: 'Class',
  [TAB_KEYS.SECTIONS]: 'Section',
  [TAB_KEYS.SUBJECTS]: 'Subject',
  [TAB_KEYS.EXAMS]: 'Exam',
}

const SUPPORTED_TAB_METADATA = {
  [TAB_KEYS.ACADEMIC_YEARS]: { label: 'Academic Years', entityLabel: 'Academic Year', supported: true },
  [TAB_KEYS.CLASSES]: { label: 'Classes', entityLabel: 'Class', supported: true },
  [TAB_KEYS.SECTIONS]: { label: 'Sections', entityLabel: 'Section', supported: true },
  [TAB_KEYS.SUBJECTS]: { label: 'Subjects', entityLabel: 'Subject', supported: true },
  [TAB_KEYS.EXAMS]: { label: 'Exams', entityLabel: 'Exam', supported: true },
}

const SAMPLE_SECTION_OPTIONS = [
  { value: '1', label: 'Section A' },
  { value: '2', label: 'Section B' },
  { value: '3', label: 'Section C' },
  { value: '4', label: 'Section D' },
]

const toSlug = (value) => {
  if (typeof value !== 'string') return ''
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const getInitialFormData = (tab) => {
  if (tab === TAB_KEYS.ACADEMIC_YEARS) {
    return {
      name: '',
      academic_year: '',
      school_id: '',
      // start_date: '',
      // end_date: '',
      is_current: false,
    }
  }

  if (tab === TAB_KEYS.SECTIONS) {
    return {
      school_id: '',
      name: '',
      code: '',
    }
  }

  if (tab === TAB_KEYS.CLASSES) {
    return {
      school_id: '',
      class_name: '',
      class_code: '',
      section_ids: [],
    }
  }

  if (tab === TAB_KEYS.SUBJECTS) {
    return {
      school_id: '',
      class_id: '',
      section_id: '',
      name: '',
      code: '',
      description: '',
    }
  }

  if (tab === TAB_KEYS.EXAMS) {
    return {
      school_id: '',
      name: '',
      exam_type: '',
      academic_year_id: '',
      class_id: '',
      start_date: '',
      end_date: '',
    }
  }

  return {
    name: '',
  }
}

const normalizeList = (resp, key) => (
  Array.isArray(resp?.items)
    ? resp.items
    : Array.isArray(resp)
      ? resp
      : Array.isArray(resp?.data)
        ? resp.data
        : Array.isArray(resp?.[key])
          ? resp[key]
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

const toEntityLabel = (label) => {
  const text = String(label || '').trim()
  if (!text) return 'Item'
  if (text.endsWith('ies')) return `${text.slice(0, -3)}y`
  if (text.endsWith('s')) return text.slice(0, -1)
  return text
}

const getAcademicsTabsFromPermissions = (authUser) => {
  const currentUser = authUser?.user ?? authUser
  const modules = Array.isArray(currentUser?.permissions)
    ? currentUser.permissions
    : Array.isArray(currentUser?.modules)
      ? currentUser.modules
      : []

  const academicsModule = modules.find((moduleItem) => {
    const moduleName = toSlug(moduleItem?.module_name || moduleItem?.display_name || moduleItem?.name || '')
    return moduleName === 'academics' || moduleName === 'academic' || moduleName.includes('academic')
  })

  const featureList = Array.isArray(academicsModule?.features)
    ? academicsModule.features
    : Array.isArray(academicsModule?.module_features)
      ? academicsModule.module_features
      : []

  const tabs = featureList.map((featureItem, index) => {
    const feature = featureItem?.feature ?? featureItem
    const featureName = featureItem?.feature_name || feature?.feature_name || feature?.display_name || feature?.name || ''
    const normalizedName = toSlug(featureName)

    if (!featureName) return null
    if (normalizedName === 'academic-years' || normalizedName === 'academic-year') return { key: TAB_KEYS.ACADEMIC_YEARS, ...SUPPORTED_TAB_METADATA[TAB_KEYS.ACADEMIC_YEARS] }
    if (normalizedName === 'classes' || normalizedName === 'class') return { key: TAB_KEYS.CLASSES, ...SUPPORTED_TAB_METADATA[TAB_KEYS.CLASSES] }
    if (normalizedName === 'sections' || normalizedName === 'section') return { key: TAB_KEYS.SECTIONS, ...SUPPORTED_TAB_METADATA[TAB_KEYS.SECTIONS] }
    if (normalizedName === 'subjects' || normalizedName === 'subject') return { key: TAB_KEYS.SUBJECTS, ...SUPPORTED_TAB_METADATA[TAB_KEYS.SUBJECTS] }
    if (normalizedName === 'exams' || normalizedName === 'exam') return { key: TAB_KEYS.EXAMS, ...SUPPORTED_TAB_METADATA[TAB_KEYS.EXAMS] }

    return {
      key: `feature-${featureItem?.feature_id ?? feature?.id ?? index}-${normalizedName || index}`,
      label: featureName,
      entityLabel: toEntityLabel(featureName),
      supported: false,
    }
  }).filter(Boolean)

  if (tabs.length > 0) return tabs

  return Object.entries(SUPPORTED_TAB_METADATA).map(([key, value]) => ({ key, ...value }))
}

function AcademicsPage() {
  const dispatch = useDispatch()
  const { user } = useSelector((state) => state.auth)
  const availableTabs = useMemo(() => getAcademicsTabsFromPermissions(user), [user])
  const availableTabKeys = useMemo(
    () => new Set(availableTabs.filter((tab) => tab.supported).map((tab) => tab.key)),
    [availableTabs],
  )

  const [activeTab, setActiveTab] = useState(TAB_KEYS.ACADEMIC_YEARS)
  const [academicYears, setAcademicYears] = useState([])
  const [classesData, setClassesData] = useState([])
  const [sectionsData, setSectionsData] = useState([])
  const [subjectsData, setSubjectsData] = useState([])
  const [examsData, setExamsData] = useState([])
  const [schoolsData, setSchoolsData] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCreatePopupOpen, setIsCreatePopupOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteError, setDeleteError] = useState('')
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

  const activeTabConfig = useMemo(
    () => availableTabs.find((tab) => tab.key === activeTab) || availableTabs[0] || { key: TAB_KEYS.ACADEMIC_YEARS, ...SUPPORTED_TAB_METADATA[TAB_KEYS.ACADEMIC_YEARS] },
    [activeTab, availableTabs],
  )
  const currentTabLabel = activeTabConfig.label
  const currentEntityLabel = activeTabConfig.entityLabel
  const isClassesTab = activeTab === TAB_KEYS.CLASSES
  const isSectionsTab = activeTab === TAB_KEYS.SECTIONS
  const isAcademicYearsTab = activeTab === TAB_KEYS.ACADEMIC_YEARS
  const isSubjectsTab = activeTab === TAB_KEYS.SUBJECTS
  const isExamsTab = activeTab === TAB_KEYS.EXAMS
  const isSupportedTab = Boolean(activeTabConfig.supported)
  const canLoadAcademicYears = availableTabKeys.has(TAB_KEYS.ACADEMIC_YEARS)
  const canLoadClasses = availableTabKeys.has(TAB_KEYS.CLASSES)
  const canLoadSections = availableTabKeys.has(TAB_KEYS.SECTIONS)

  const tabPermissions = useMemo(() => {
    return getCrudPermissions(user, {
      moduleMatchers: ['academics', 'academic', 'class'],
      featureMatchers: [currentTabLabel],
      featureMatchMode: 'exact',
    })
  }, [currentTabLabel, user])
  const canOpenCreatePopup = isSupportedTab && tabPermissions.canCreate
  const canShowCreateButton = isSupportedTab && tabPermissions.canCreate
  const showActionColumn = tabPermissions.canAdd || tabPermissions.canEdit || tabPermissions.canDelete
  const renderCrudActionButtons = (item) => (
    <div className="role-management-table-actions">
      {tabPermissions.canEdit && (
        <button
          type="button"
          className="role-management-action-btn role-management-action-btn-edit"
          onClick={() => handleOpenEdit(item)}
          aria-label={`Edit ${item?.name || currentTabLabel || 'item'}`}
          title="Edit"
        >
          <EditActionIcon />
        </button>
      )}
      {tabPermissions.canDelete && (
        <button
          type="button"
          className="role-management-action-btn role-management-action-btn-delete"
          onClick={() => requestDelete(item)}
          disabled={actionLoadingId === String(item?.id)}
          aria-label={`Delete ${item?.name || currentTabLabel || 'item'}`}
          title="Delete"
        >
          <DeleteActionIcon />
        </button>
      )}
      {!tabPermissions.canEdit && !tabPermissions.canDelete && <span>-</span>}
    </div>
  )

  const currentTableData = useMemo(() => {
    if (isClassesTab) return classesData
    if (isSectionsTab) return sectionsData
    if (isSubjectsTab) return subjectsData
    if (isExamsTab) return examsData
    if (!isAcademicYearsTab) return []
    return academicYears
  }, [academicYears, classesData, examsData, isAcademicYearsTab, isClassesTab, isExamsTab, isSectionsTab, isSubjectsTab, sectionsData, subjectsData])

  const schoolOptions = useMemo(() => (
    schoolsData.map((school, index) => ({
      value: String(school?.id ?? ''),
      label: school?.name || `School ${index + 1}`,
    }))
  ), [schoolsData])
  const sectionOptions = useMemo(() => (
    sectionsData.length > 0
      ? sectionsData.map((section, index) => ({
        value: String(section?.id ?? ''),
        label: section?.name || `Section ${index + 1}`,
      }))
      : SAMPLE_SECTION_OPTIONS
  ), [sectionsData])
  const classOptions = useMemo(() => (
    classesData.map((item, index) => ({
      value: String(item?.id ?? ''),
      label: item?.name || item?.class_name || `Class ${index + 1}`,
    }))
  ), [classesData])
  const academicYearOptions = useMemo(() => (
    academicYears.map((item, index) => ({
      value: String(item?.id ?? ''),
      label: item?.name || item?.academic_year || `Academic Year ${index + 1}`,
    }))
  ), [academicYears])
  useEffect(() => {
    if (availableTabs.length === 0) return
    if (!availableTabs.some((tab) => tab.key === activeTab)) {
      setActiveTab(availableTabs[0].key)
    }
  }, [activeTab, availableTabs])

  const refreshByTab = async (tab) => {
    if (!user?.access_token) return
    if (!availableTabKeys.has(tab)) {
      if (tab === TAB_KEYS.CLASSES) setClassesData([])
      if (tab === TAB_KEYS.SECTIONS) setSectionsData([])
      if (tab === TAB_KEYS.SUBJECTS) setSubjectsData([])
      if (tab === TAB_KEYS.EXAMS) setExamsData([])
      if (tab === TAB_KEYS.ACADEMIC_YEARS) setAcademicYears([])
      return
    }

    setIsLoading(true)
    setError('')
    try {
      if (tab === TAB_KEYS.CLASSES) {
        const resp = await dispatch(fetchClasses({ access_token: user.access_token })).unwrap()
        setClassesData(normalizeList(resp))
      } else if (tab === TAB_KEYS.SECTIONS) {
        const resp = await dispatch(fetchSections({ access_token: user.access_token })).unwrap()
        setSectionsData(normalizeList(resp))
      } else if (tab === TAB_KEYS.SUBJECTS) {
        const resp = await dispatch(fetchSubjects({
          access_token: user.access_token,
          page: 1,
          page_size: 10,
        })).unwrap()
        setSubjectsData(normalizeList(resp))
      } else if (tab === TAB_KEYS.EXAMS) {
        const resp = await dispatch(fetchExams({
          access_token: user.access_token,
          page: 1,
          page_size: 10,
        })).unwrap()
        setExamsData(normalizeList(resp, 'exams'))
      } else if (tab === TAB_KEYS.ACADEMIC_YEARS) {
        const resp = await dispatch(fetchAcademicYears({ access_token: user.access_token })).unwrap()
        setAcademicYears(normalizeList(resp))
      } else {
        setAcademicYears([])
        setClassesData([])
        setSectionsData([])
        setSubjectsData([])
        setExamsData([])
      }
    } catch (err) {
      setError(typeof err === 'string' ? err : `Failed to fetch ${currentTabLabel.toLowerCase()}.`)
      if (tab === TAB_KEYS.CLASSES) setClassesData([])
      if (tab === TAB_KEYS.SECTIONS) setSectionsData([])
      if (tab === TAB_KEYS.SUBJECTS) setSubjectsData([])
      if (tab === TAB_KEYS.EXAMS) setExamsData([])
      if (tab === TAB_KEYS.ACADEMIC_YEARS) setAcademicYears([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    refreshByTab(activeTab)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, user?.access_token, activeTab, availableTabKeys])

  useEffect(() => {
    const loadSchools = async () => {
      if (!user?.access_token) return

      try {
        const resp = await dispatch(fetchSchools({
          access_token: user.access_token,
          organization_id: 1,
          page: 1,
          page_size: 10,
        })).unwrap()
        setSchoolsData(normalizeList(resp, 'schools'))
      } catch {
        setSchoolsData([])
      }
    }

    loadSchools()
  }, [dispatch, user?.access_token])

  useEffect(() => {
    const loadClassFormOptions = async () => {
      if (!user?.access_token) return

      try {
        const requests = []

        if (canLoadClasses) {
          requests.push(
            dispatch(fetchClasses({ access_token: user.access_token }))
              .unwrap()
              .then((resp) => {
                setClassesData(normalizeList(resp))
              }),
          )
        } else {
          setClassesData([])
        }

        if (canLoadSections) {
          requests.push(
            dispatch(fetchSections({ access_token: user.access_token }))
              .unwrap()
              .then((resp) => {
                setSectionsData(normalizeList(resp))
              }),
          )
        } else {
          setSectionsData([])
        }

        if (canLoadAcademicYears) {
          requests.push(
            dispatch(fetchAcademicYears({ access_token: user.access_token }))
              .unwrap()
              .then((resp) => {
                setAcademicYears(normalizeList(resp))
              }),
          )
        } else {
          setAcademicYears([])
        }

        await Promise.all(requests)
      } catch {
        // Keep existing data when auxiliary options fail to load.
      }
    }

    loadClassFormOptions()
  }, [canLoadAcademicYears, canLoadClasses, canLoadSections, dispatch, user?.access_token])

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
      if (!String(values.school_id ?? '').trim()) nextErrors.school_id = 'School is required.'
    } else if (tab !== TAB_KEYS.CLASSES && !values.name?.trim()) {
      nextErrors.name = 'Name is required.'
    }

    // if (tab === TAB_KEYS.ACADEMIC_YEARS) {
    //   if (!values.start_date) nextErrors.start_date = 'Start date is required.'
    //   if (!values.end_date) nextErrors.end_date = 'End date is required.'
    // }

    if (tab === TAB_KEYS.SECTIONS) {
      if (!String(values.school_id ?? '').trim()) nextErrors.school_id = 'School is required.'
      if (!values.name?.trim()) nextErrors.name = 'Name is required.'
      if (!String(values.code ?? '').trim()) nextErrors.code = 'Code is required.'
    }

    if (tab === TAB_KEYS.CLASSES) {
      if (!String(values.school_id ?? '').trim()) {
        nextErrors.school_id = 'School is required.'
      }
      if (!String(values.class_name ?? '').trim()) {
        nextErrors.class_name = 'Class name is required.'
      }
      if (!String(values.class_code ?? '').trim()) {
        nextErrors.class_code = 'Code is required.'
      }
      if (!Array.isArray(values.section_ids) || values.section_ids.length === 0) {
        nextErrors.section_ids = 'Select at least one section.'
      }

    }

    if (tab === TAB_KEYS.SUBJECTS) {
      if (!String(values.school_id ?? '').trim()) nextErrors.school_id = 'School is required.'
      if (!String(values.class_id ?? '').trim()) nextErrors.class_id = 'Class is required.'
      if (!String(values.section_id ?? '').trim()) nextErrors.section_id = 'Section is required.'
      if (!String(values.name ?? '').trim()) nextErrors.name = 'Name is required.'
      if (!String(values.code ?? '').trim()) nextErrors.code = 'Code is required.'
      if (!String(values.description ?? '').trim()) nextErrors.description = 'Description is required.'
    }

    if (tab === TAB_KEYS.EXAMS) {
      if (!String(values.school_id ?? '').trim()) nextErrors.school_id = 'School is required.'
      if (!String(values.name ?? '').trim()) nextErrors.name = 'Name is required.'
      if (!String(values.exam_type ?? '').trim()) nextErrors.exam_type = 'Exam type is required.'
      if (!String(values.academic_year_id ?? '').trim()) nextErrors.academic_year_id = 'Academic year is required.'
      if (!String(values.class_id ?? '').trim()) nextErrors.class_id = 'Class is required.'
      if (!String(values.start_date ?? '').trim()) nextErrors.start_date = 'Start date is required.'
      if (!String(values.end_date ?? '').trim()) nextErrors.end_date = 'End date is required.'
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

  const handleClassSectionToggle = (sectionId) => {
    setFormData((prev) => {
      const currentIds = Array.isArray(prev.section_ids) ? prev.section_ids : []
      const nextIds = currentIds.includes(sectionId)
        ? currentIds.filter((id) => id !== sectionId)
        : [...currentIds, sectionId]

      return {
        ...prev,
        section_ids: nextIds,
      }
    })
    setFormError((prev) => ({ ...prev, section_ids: '', submit: '' }))
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
    const validationErrors = validateForm(activeTab, formData)
    console.log('active tab create:- ',activeTab)
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
      console.log('active tab',activeTab  )
      console.log('active tab key',TAB_KEYS  )
      if (activeTab === TAB_KEYS.CLASSES) {
        const normalizedSectionIds = (Array.isArray(formData.section_ids) ? formData.section_ids : [])
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id) && id > 0)

        await dispatch(fetchCreateClass({
          //class_id: 0,
          school_id: Number(formData.school_id),
          name: formData.class_name.trim(),
          code: String(formData.class_code || '').trim(),
          sort_order: 0,
          sections: normalizedSectionIds,
        //  subjects: [],
          access_token: user.access_token,
          priority:0
        })).unwrap()
      } else if (activeTab === TAB_KEYS.SECTIONS) {
        await dispatch(
          fetchCreateSection({
            school_id: Number(formData.school_id),
            name: formData.name,
            code: formData.code,
            access_token: user.access_token,
          }),
        ).unwrap()
      } else if (activeTab === TAB_KEYS.ACADEMIC_YEARS) {
        await dispatch(
          fetchCreateAcademicYear({
            name: formData.name,
            academic_year: formData.academic_year,
            school_id: Number(formData.school_id),
            // start_date: formData.start_date,
            // end_date: formData.end_date,
            is_current: Boolean(formData.is_current),
            access_token: user.access_token,
          }),
        ).unwrap()
      } else if (activeTab === TAB_KEYS.SUBJECTS) {
        console.log('subjetcs tab:- ',activeTab)
        await dispatch(
          fetchCreateSubject({
            school_id: Number(formData.school_id),
            class_id: Number(formData.class_id),
            section_id: Number(formData.section_id),
            name: String(formData.name || '').trim(),
            code: String(formData.code || '').trim(),
            description: String(formData.description || '').trim(),
            access_token: user.access_token,
          }),
        ).unwrap()
      } else if (activeTab === TAB_KEYS.EXAMS) {
        await dispatch(
          fetchCreateExam({
            school_id: Number(formData.school_id),
            name: String(formData.name || '').trim(),
            exam_type: String(formData.exam_type || '').trim(),
            academic_year_id: Number(formData.academic_year_id),
            class_id: Number(formData.class_id),
            start_date: String(formData.start_date || '').trim(),
            end_date: String(formData.end_date || '').trim(),
            access_token: user.access_token,
          }),
        ).unwrap()
      } else {
        throw new Error(`${currentTabLabel} is not configured yet.`)
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
        code: item?.code || '',
      })
    } else if (activeTab === TAB_KEYS.CLASSES) {
      setEditFormData({
        name: item?.name || '',
      })
    } else if (activeTab === TAB_KEYS.SUBJECTS) {
      setEditFormData({
        school_id: String(item?.school_id ?? item?.school?.id ?? ''),
        class_id: String(item?.class_id ?? ''),
        section_id: String(item?.section_id ?? ''),
        name: item?.name || '',
        code: item?.code || '',
        description: item?.description || '',
      })
    } else if (activeTab === TAB_KEYS.EXAMS) {
      setEditFormData({
        school_id: String(item?.school_id ?? item?.school?.id ?? ''),
        name: item?.name || '',
        exam_type: item?.exam_type || '',
        academic_year_id: String(item?.academic_year_id ?? item?.academic_year?.id ?? ''),
        class_id: String(item?.class_id ?? item?.class?.id ?? ''),
        start_date: item?.start_date || '',
        end_date: item?.end_date || '',
      })
    } else {
      setEditFormData(getInitialFormData(activeTab))
    }
    setFormError({})
    setMessage('')
  }

  const handleUpdate = async (event) => {
    
    event.preventDefault()
    const validationErrors = activeTab === TAB_KEYS.CLASSES
    console.log('section edit',TAB_KEYS.CLASSES)
      ? (!String(editFormData.name ?? '').trim() ? { name: 'Name is required.' } : {})
      : validateForm(activeTab, editFormData)
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
            name: String(editFormData.name || '').trim(),
            code: String(editFormData.code || '').trim(),
            access_token: user.access_token,
          }),
        ).unwrap()
      } else if (activeTab === TAB_KEYS.ACADEMIC_YEARS) {
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
      } else if (activeTab === TAB_KEYS.SUBJECTS) {
        await dispatch(
          fetchUpdateSubject({
            subject_id: editingItem.id,
            school_id: Number(editFormData.school_id),
            class_id: Number(editFormData.class_id),
            section_id: Number(editFormData.section_id),
            name: String(editFormData.name || '').trim(),
            code: String(editFormData.code || '').trim(),
            description: String(editFormData.description || '').trim(),
            access_token: user.access_token,
          }),
        ).unwrap()
      } else if (activeTab === TAB_KEYS.EXAMS) {
        await dispatch(
          fetchUpdateExam({
            exam_id: editingItem.id,
            school_id: Number(editFormData.school_id),
            name: String(editFormData.name || '').trim(),
            exam_type: String(editFormData.exam_type || '').trim(),
            academic_year_id: Number(editFormData.academic_year_id),
            class_id: Number(editFormData.class_id),
            start_date: String(editFormData.start_date || '').trim(),
            end_date: String(editFormData.end_date || '').trim(),
            access_token: user.access_token,
          }),
        ).unwrap()
      } else {
        throw new Error(`${currentTabLabel} is not configured yet.`)
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
    setError('')
    setDeleteError('')
    setDeleteTarget(item)
  }

  const closeDeletePopup = () => {
    setDeleteError('')
    setDeleteTarget(null)
  }

  const handleDelete = async () => {
    const id = deleteTarget?.id
    if (!user?.access_token || !id) return
    if (actionLoadingId === String(id)) return

    setActionLoadingId(String(id))
    setMessage('')
    setDeleteError('')
    try {
      if (activeTab === TAB_KEYS.CLASSES) {
        await dispatch(fetchDeleteClass({ id, access_token: user.access_token })).unwrap()
      } else if (activeTab === TAB_KEYS.SECTIONS) {
        await dispatch(fetchDeleteSection({ id, access_token: user.access_token })).unwrap()
      } else if (activeTab === TAB_KEYS.ACADEMIC_YEARS) {
        await dispatch(fetchDeleteAcademicYear({ id, access_token: user.access_token })).unwrap()
      } else if (activeTab === TAB_KEYS.SUBJECTS) {
        await dispatch(fetchDeleteSubject({ subject_id: id, access_token: user.access_token })).unwrap()
      } else if (activeTab === TAB_KEYS.EXAMS) {
        await dispatch(fetchDeleteExam({ exam_id: id, access_token: user.access_token })).unwrap()
      } else {
        throw new Error(`${currentTabLabel} is not configured yet.`)
      }

      closeDeletePopup()
      await refreshByTab(activeTab)
      setMessage(`${currentEntityLabel} deleted successfully.`)
    } catch (err) {
      const nextDeleteError = typeof err === 'string' ? err : `Failed to delete ${currentEntityLabel.toLowerCase()}.`
      setDeleteError(nextDeleteError)
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
          render: (item) => renderCrudActionButtons(item),
        })
      }

      return classColumns
    }

    if (activeTab === TAB_KEYS.SECTIONS) {
      const sectionColumns = [
        { key: 'id', header: 'Section Id' },
        { key: 'name', header: 'Name' },
        { key: 'code', header: 'Code' },
      ]

      if (showActionColumn) {
        sectionColumns.push({
          key: 'action',
          header: 'Action',
          render: (item) => renderCrudActionButtons(item),
        })
      }

      return sectionColumns
    }

    if (isSubjectsTab) {
      const subjectColumns = [
        { key: 'name', header: 'Name' },
        { key: 'description', header: 'Description' },
      ]

      if (showActionColumn) {
        subjectColumns.push({
          key: 'action',
          header: 'Action',
          render: (item) => renderCrudActionButtons(item),
        })
      }

      return subjectColumns
    }

    if (isExamsTab) {
      const examColumns = [
        { key: 'name', header: 'Name' },
        { key: 'exam_type', header: 'Exam Type' },
        {
          key: 'academic_year',
          header: 'Academic Year',
          render: (item) => item?.academic_year?.name || item?.academic_year?.academic_year || item?.academic_year_name || item?.academic_year_id || '-',
        },
        {
          key: 'class_name',
          header: 'Class',
          render: (item) => item?.class?.name || item?.class_name || item?.class_id || '-',
        },
        { key: 'start_date', header: 'Start Date' },
        { key: 'end_date', header: 'End Date' },
      ]

      if (showActionColumn) {
        examColumns.push({
          key: 'action',
          header: 'Action',
          render: (item) => renderCrudActionButtons(item),
        })
      }

      return examColumns
    }

    if (!isAcademicYearsTab) {
      return []
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
        render: (item) => renderCrudActionButtons(item),
      })
    }

    return yearColumns
  }, [actionLoadingId, activeTab, isAcademicYearsTab, isExamsTab, isSubjectsTab, showActionColumn, tabPermissions.canDelete, tabPermissions.canEdit])

  return (
    <section className="role-management-wrap">
      <div className="role-management-card">
        <div className="role-management-head">
          <div className="role-management-head-row">
            <h2 className="role-management-title">{currentTabLabel}</h2>
            {canShowCreateButton && (
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
          {availableTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`role-management-tab-btn ${activeTab === tab.key ? 'role-management-tab-btn-active' : ''}`}
              onClick={() => {setActiveTab(tab.key),console.log("tab:_ ",tab)}}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {isLoading && <p className="role-management-info">{`Loading ${currentTabLabel.toLowerCase()}...`}</p>}
        {error && <p className="role-management-error">{error}</p>}
        {!isLoading && !error && !isSupportedTab && (
          <p className="role-management-info">{`${currentTabLabel} tab is available from permissions, but this screen is not configured yet.`}</p>
        )}
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

      {isCreatePopupOpen && canOpenCreatePopup && (
        <div className="custom-popup-backdrop" role="presentation">
          <div
            className={`custom-popup ${activeTab === TAB_KEYS.CLASSES ? 'academic-class-create-popup' : 'role-management-create-popup'}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-academic-tab-title"
          >
            <h3 id="create-academic-tab-title" className="custom-popup-title">{`Create ${currentEntityLabel}`}</h3>
            <form
              className={`role-management-form ${activeTab === TAB_KEYS.CLASSES ? 'academic-class-form' : ''}`.trim()}
              onSubmit={handleCreate}
            >
              {activeTab !== TAB_KEYS.CLASSES && activeTab !== TAB_KEYS.SUBJECTS && activeTab !== TAB_KEYS.EXAMS && (
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
              )}

              {activeTab === TAB_KEYS.CLASSES && (
                <>
                  <div className="role-management-field">
                    <label htmlFor="academic-class-school" className="role-management-label">School</label>
                    <select
                      id="academic-class-school"
                      name="school_id"
                      className="role-management-select"
                      value={formData.school_id}
                      onChange={handleInputChange}
                    >
                      <option value="">Select school</option>
                      {schoolOptions.map((school) => (
                        <option key={school.value} value={school.value}>{school.label}</option>
                      ))}
                    </select>
                    {formError.school_id && <p className="role-management-field-error">{formError.school_id}</p>}
                  </div>

                  <div className="role-management-field">
                    <label htmlFor="academic-class-name" className="role-management-label">Class Name</label>
                    <input
                      id="academic-class-name"
                      name="class_name"
                      type="text"
                      className="role-management-input"
                      value={formData.class_name}
                      onChange={handleInputChange}
                      placeholder="Enter class name"
                    />
                    {formError.class_name && <p className="role-management-field-error">{formError.class_name}</p>}
                  </div>

                  <div className="role-management-field">
                    <label htmlFor="academic-class-code" className="role-management-label">Code</label>
                    <input
                      id="academic-class-code"
                      name="class_code"
                      type="text"
                      className="role-management-input"
                      value={formData.class_code}
                      onChange={handleInputChange}
                      placeholder="Enter class code"
                    />
                    {formError.class_code && <p className="role-management-field-error">{formError.class_code}</p>}
                  </div>

                  <div className="role-management-field">
                    <span className="role-management-label">Sections</span>
                    <div className="academic-class-sections-list">
                      {sectionOptions.map((option) => {
                        const isChecked = Array.isArray(formData.section_ids) && formData.section_ids.includes(option.value)
                        return (
                          <label key={option.value} className="academic-class-section-option">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleClassSectionToggle(option.value)}
                            />
                            <span>{option.label}</span>
                          </label>
                        )
                      })}
                    </div>
                    {formError.section_ids && <p className="role-management-field-error">{formError.section_ids}</p>}
                  </div>
                </>
              )}

              {activeTab === TAB_KEYS.SUBJECTS && (
                <>
                  <div className="role-management-field">
                    <label htmlFor="academic-subject-school" className="role-management-label">School</label>
                    <select
                      id="academic-subject-school"
                      name="school_id"
                      className="role-management-select"
                      value={formData.school_id}
                      onChange={handleInputChange}
                    >
                      <option value="">Select school</option>
                      {schoolOptions.map((school) => (
                        <option key={school.value} value={school.value}>{school.label}</option>
                      ))}
                    </select>
                    {formError.school_id && <p className="role-management-field-error">{formError.school_id}</p>}
                  </div>

                  <div className="role-management-field">
                    <label htmlFor="academic-subject-class" className="role-management-label">Class</label>
                    <select
                      id="academic-subject-class"
                      name="class_id"
                      className="role-management-select"
                      value={formData.class_id}
                      onChange={handleInputChange}
                    >
                      <option value="">Select class</option>
                      {classesData.map((item, index) => (
                        <option key={item?.id ?? index} value={String(item?.id ?? '')}>
                          {item?.name || item?.class_name || `Class ${index + 1}`}
                        </option>
                      ))}
                    </select>
                    {formError.class_id && <p className="role-management-field-error">{formError.class_id}</p>}
                  </div>

                  <div className="role-management-field">
                    <label htmlFor="academic-subject-section" className="role-management-label">Section</label>
                    <select
                      id="academic-subject-section"
                      name="section_id"
                      className="role-management-select"
                      value={formData.section_id}
                      onChange={handleInputChange}
                    >
                      <option value="">Select section</option>
                      {sectionOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    {formError.section_id && <p className="role-management-field-error">{formError.section_id}</p>}
                  </div>

                  <div className="role-management-field">
                    <label htmlFor="academic-subject-name" className="role-management-label">Name</label>
                    <input
                      id="academic-subject-name"
                      name="name"
                      type="text"
                      className="role-management-input"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Enter subject name"
                    />
                    {formError.name && <p className="role-management-field-error">{formError.name}</p>}
                  </div>

                  <div className="role-management-field">
                    <label htmlFor="academic-subject-code" className="role-management-label">Code</label>
                    <input
                      id="academic-subject-code"
                      name="code"
                      type="text"
                      className="role-management-input"
                      value={formData.code}
                      onChange={handleInputChange}
                      placeholder="Enter subject code"
                    />
                    {formError.code && <p className="role-management-field-error">{formError.code}</p>}
                  </div>

                  <div className="role-management-field" style={{ gridColumn: '1 / -1' }}>
                    <label htmlFor="academic-subject-description" className="role-management-label">Description</label>
                    <textarea
                      id="academic-subject-description"
                      name="description"
                      className="role-management-input"
                      value={formData.description}
                      onChange={handleInputChange}
                      placeholder="Enter description"
                      rows={4}
                    />
                    {formError.description && <p className="role-management-field-error">{formError.description}</p>}
                  </div>
                </>
              )}

              {activeTab === TAB_KEYS.EXAMS && (
                <>
                  <div className="role-management-field">
                    <label htmlFor="academic-exam-school" className="role-management-label">School</label>
                    <select
                      id="academic-exam-school"
                      name="school_id"
                      className="role-management-select"
                      value={formData.school_id}
                      onChange={handleInputChange}
                    >
                      <option value="">Select school</option>
                      {schoolOptions.map((school) => (
                        <option key={school.value} value={school.value}>{school.label}</option>
                      ))}
                    </select>
                    {formError.school_id && <p className="role-management-field-error">{formError.school_id}</p>}
                  </div>

                  <div className="role-management-field">
                    <label htmlFor="academic-exam-name" className="role-management-label">Name</label>
                    <input
                      id="academic-exam-name"
                      name="name"
                      type="text"
                      className="role-management-input"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Enter exam name"
                    />
                    {formError.name && <p className="role-management-field-error">{formError.name}</p>}
                  </div>

                  <div className="role-management-field">
                    <label htmlFor="academic-exam-type" className="role-management-label">Exam Type</label>
                    <input
                      id="academic-exam-type"
                      name="exam_type"
                      type="text"
                      className="role-management-input"
                      value={formData.exam_type}
                      onChange={handleInputChange}
                      placeholder="Enter exam type"
                    />
                    {formError.exam_type && <p className="role-management-field-error">{formError.exam_type}</p>}
                  </div>

                  <div className="role-management-field">
                    <label htmlFor="academic-exam-year" className="role-management-label">Academic Year</label>
                    <select
                      id="academic-exam-year"
                      name="academic_year_id"
                      className="role-management-select"
                      value={formData.academic_year_id}
                      onChange={handleInputChange}
                    >
                      <option value="">Select academic year</option>
                      {academicYearOptions.map((item) => (
                        <option key={item.value} value={item.value}>{item.label}</option>
                      ))}
                    </select>
                    {formError.academic_year_id && <p className="role-management-field-error">{formError.academic_year_id}</p>}
                  </div>

                  <div className="role-management-field">
                    <label htmlFor="academic-exam-class" className="role-management-label">Class</label>
                    <select
                      id="academic-exam-class"
                      name="class_id"
                      className="role-management-select"
                      value={formData.class_id}
                      onChange={handleInputChange}
                    >
                      <option value="">Select class</option>
                      {classOptions.map((item) => (
                        <option key={item.value} value={item.value}>{item.label}</option>
                      ))}
                    </select>
                    {formError.class_id && <p className="role-management-field-error">{formError.class_id}</p>}
                  </div>

                  <div className="role-management-field">
                    <label htmlFor="academic-exam-start-date" className="role-management-label">Start Date</label>
                    <input
                      id="academic-exam-start-date"
                      name="start_date"
                      type="date"
                      className="role-management-input"
                      value={formData.start_date}
                      onChange={handleInputChange}
                    />
                    {formError.start_date && <p className="role-management-field-error">{formError.start_date}</p>}
                  </div>

                  <div className="role-management-field">
                    <label htmlFor="academic-exam-end-date" className="role-management-label">End Date</label>
                    <input
                      id="academic-exam-end-date"
                      name="end_date"
                      type="date"
                      className="role-management-input"
                      value={formData.end_date}
                      onChange={handleInputChange}
                    />
                    {formError.end_date && <p className="role-management-field-error">{formError.end_date}</p>}
                  </div>
                </>
              )}

              {activeTab === TAB_KEYS.ACADEMIC_YEARS && (
                <>
                  <div className="role-management-field">
                    <label htmlFor="academic-school-id" className="role-management-label">School</label>
                    <select
                      id="academic-school-id"
                      name="school_id"
                      className="role-management-select"
                      value={formData.school_id}
                      onChange={handleInputChange}
                    >
                      <option value="">Select school</option>
                      {schoolOptions.map((school) => (
                        <option key={school.value} value={school.value}>{school.label}</option>
                      ))}
                    </select>
                    {formError.school_id && <p className="role-management-field-error">{formError.school_id}</p>}
                  </div>

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
                <>
                  <div className="role-management-field">
                    <label htmlFor="academic-section-school" className="role-management-label">School</label>
                    <select
                      id="academic-section-school"
                      name="school_id"
                      className="role-management-select"
                      value={formData.school_id}
                      onChange={handleInputChange}
                    >
                      <option value="">Select school</option>
                      {schoolOptions.map((school) => (
                        <option key={school.value} value={school.value}>{school.label}</option>
                      ))}
                    </select>
                    {formError.school_id && <p className="role-management-field-error">{formError.school_id}</p>}
                  </div>

                  <div className="role-management-field">
                    <label htmlFor="academic-section-code" className="role-management-label">Code</label>
                    <input
                      id="academic-section-code"
                      name="code"
                      type="text"
                      className="role-management-input"
                      value={formData.code}
                      onChange={handleInputChange}
                      placeholder="Enter section code"
                    />
                    {formError.code && <p className="role-management-field-error">{formError.code}</p>}
                  </div>
                </>
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
              {activeTab !== TAB_KEYS.SUBJECTS && activeTab !== TAB_KEYS.EXAMS && (
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
              )}

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
                  <label htmlFor="edit-academic-section-code" className="role-management-label">Code</label>
                  <input
                    id="edit-academic-section-code"
                    name="code"
                    type="text"
                    className="role-management-input"
                    value={editFormData.code}
                    onChange={handleEditInputChange}
                    placeholder="Enter section code"
                  />
                  {formError.code && <p className="role-management-field-error">{formError.code}</p>}
                </div>
              )}

              {activeTab === TAB_KEYS.SUBJECTS && (
                <>
                  <div className="role-management-field">
                    <label htmlFor="edit-subject-school_id" className="role-management-label">School</label>
                    <select
                      id="edit-subject-school_id"
                      name="school_id"
                      className="role-management-select"
                      value={editFormData.school_id}
                      onChange={handleEditInputChange}
                    >
                      <option value="">Select school</option>
                      {schoolOptions.map((school) => (
                        <option key={school.value} value={school.value}>{school.label}</option>
                      ))}
                    </select>
                    {formError.school_id && <p className="role-management-field-error">{formError.school_id}</p>}
                  </div>

                  <div className="role-management-field">
                    <label htmlFor="edit-subject-class_id" className="role-management-label">Class</label>
                    <select
                      id="edit-subject-class_id"
                      name="class_id"
                      className="role-management-select"
                      value={editFormData.class_id}
                      onChange={handleEditInputChange}
                    >
                      <option value="">Select class</option>
                      {classesData.map((item, index) => (
                        <option key={item?.id ?? index} value={String(item?.id ?? '')}>
                          {item?.name || item?.class_name || `Class ${index + 1}`}
                        </option>
                      ))}
                    </select>
                    {formError.class_id && <p className="role-management-field-error">{formError.class_id}</p>}
                  </div>

                  <div className="role-management-field">
                    <label htmlFor="edit-subject-section_id" className="role-management-label">Section</label>
                    <select
                      id="edit-subject-section_id"
                      name="section_id"
                      className="role-management-select"
                      value={editFormData.section_id}
                      onChange={handleEditInputChange}
                    >
                      <option value="">Select section</option>
                      {sectionOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    {formError.section_id && <p className="role-management-field-error">{formError.section_id}</p>}
                  </div>

                  <div className="role-management-field">
                    <label htmlFor="edit-subject-name" className="role-management-label">Name</label>
                    <input
                      id="edit-subject-name"
                      name="name"
                      type="text"
                      className="role-management-input"
                      value={editFormData.name}
                      onChange={handleEditInputChange}
                      placeholder="Enter subject name"
                    />
                    {formError.name && <p className="role-management-field-error">{formError.name}</p>}
                  </div>

                  <div className="role-management-field">
                    <label htmlFor="edit-subject-code" className="role-management-label">Code</label>
                    <input
                      id="edit-subject-code"
                      name="code"
                      type="text"
                      className="role-management-input"
                      value={editFormData.code}
                      onChange={handleEditInputChange}
                      placeholder="Enter subject code"
                    />
                    {formError.code && <p className="role-management-field-error">{formError.code}</p>}
                  </div>

                  <div className="role-management-field">
                    <label htmlFor="edit-subject-description" className="role-management-label">Description</label>
                    <textarea
                      id="edit-subject-description"
                      name="description"
                      className="role-management-input"
                      value={editFormData.description}
                      onChange={handleEditInputChange}
                      placeholder="Enter description"
                      rows={4}
                    />
                    {formError.description && <p className="role-management-field-error">{formError.description}</p>}
                  </div>
                </>
              )}

              {activeTab === TAB_KEYS.EXAMS && (
                <>
                  <div className="role-management-field">
                    <label htmlFor="edit-exam-school_id" className="role-management-label">School</label>
                    <select
                      id="edit-exam-school_id"
                      name="school_id"
                      className="role-management-select"
                      value={editFormData.school_id}
                      onChange={handleEditInputChange}
                    >
                      <option value="">Select school</option>
                      {schoolOptions.map((school) => (
                        <option key={school.value} value={school.value}>{school.label}</option>
                      ))}
                    </select>
                    {formError.school_id && <p className="role-management-field-error">{formError.school_id}</p>}
                  </div>

                  <div className="role-management-field">
                    <label htmlFor="edit-exam-name" className="role-management-label">Name</label>
                    <input
                      id="edit-exam-name"
                      name="name"
                      type="text"
                      className="role-management-input"
                      value={editFormData.name}
                      onChange={handleEditInputChange}
                      placeholder="Enter exam name"
                    />
                    {formError.name && <p className="role-management-field-error">{formError.name}</p>}
                  </div>

                  <div className="role-management-field">
                    <label htmlFor="edit-exam-type" className="role-management-label">Exam Type</label>
                    <input
                      id="edit-exam-type"
                      name="exam_type"
                      type="text"
                      className="role-management-input"
                      value={editFormData.exam_type}
                      onChange={handleEditInputChange}
                      placeholder="Enter exam type"
                    />
                    {formError.exam_type && <p className="role-management-field-error">{formError.exam_type}</p>}
                  </div>

                  <div className="role-management-field">
                    <label htmlFor="edit-exam-year" className="role-management-label">Academic Year</label>
                    <select
                      id="edit-exam-year"
                      name="academic_year_id"
                      className="role-management-select"
                      value={editFormData.academic_year_id}
                      onChange={handleEditInputChange}
                    >
                      <option value="">Select academic year</option>
                      {academicYearOptions.map((item) => (
                        <option key={item.value} value={item.value}>{item.label}</option>
                      ))}
                    </select>
                    {formError.academic_year_id && <p className="role-management-field-error">{formError.academic_year_id}</p>}
                  </div>

                  <div className="role-management-field">
                    <label htmlFor="edit-exam-class" className="role-management-label">Class</label>
                    <select
                      id="edit-exam-class"
                      name="class_id"
                      className="role-management-select"
                      value={editFormData.class_id}
                      onChange={handleEditInputChange}
                    >
                      <option value="">Select class</option>
                      {classOptions.map((item) => (
                        <option key={item.value} value={item.value}>{item.label}</option>
                      ))}
                    </select>
                    {formError.class_id && <p className="role-management-field-error">{formError.class_id}</p>}
                  </div>

                  <div className="role-management-field">
                    <label htmlFor="edit-exam-start-date" className="role-management-label">Start Date</label>
                    <input
                      id="edit-exam-start-date"
                      name="start_date"
                      type="date"
                      className="role-management-input"
                      value={editFormData.start_date}
                      onChange={handleEditInputChange}
                    />
                    {formError.start_date && <p className="role-management-field-error">{formError.start_date}</p>}
                  </div>

                  <div className="role-management-field">
                    <label htmlFor="edit-exam-end-date" className="role-management-label">End Date</label>
                    <input
                      id="edit-exam-end-date"
                      name="end_date"
                      type="date"
                      className="role-management-input"
                      value={editFormData.end_date}
                      onChange={handleEditInputChange}
                    />
                    {formError.end_date && <p className="role-management-field-error">{formError.end_date}</p>}
                  </div>
                </>
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
        onConfirm={handleDelete}
        confirmText={actionLoadingId === String(deleteTarget?.id) ? 'Deleting...' : 'Delete'}
        onCancel={closeDeletePopup}
        cancelText="Cancel"
        showCancel
        isDanger
        titleId="delete-academic-tab-title"
      >
        <p className="custom-popup-message">
          {`Are you sure you want to delete "${deleteTarget?.name || `this ${currentEntityLabel.toLowerCase()}`}"?`}
        </p>
        {deleteError && <p className="role-management-field-error">{deleteError}</p>}
        <div className="custom-popup-actions">
          <button
            type="button"
            className="otp-back-btn custom-popup-btn"
            onClick={closeDeletePopup}
          >
            Cancel
          </button>
          <button
            type="button"
            className="login-submit-btn custom-popup-btn custom-popup-danger-btn"
            onClick={handleDelete}
            disabled={actionLoadingId === String(deleteTarget?.id)}
          >
            {actionLoadingId === String(deleteTarget?.id) ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </CustomPopup>
    </section>
  )
}

export default AcademicsPage
