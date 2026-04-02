import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { DeleteActionIcon, EditActionIcon } from '../components/ActionIcons'
import CustomPopup from '../components/CustomPopup'
import CustomTable from '../components/CustomTable'
import {
  createRazorpayOrder,
  fetchCreateFeeType,
  fetchCreateFeeStructure,
  fetchDeleteFeeType,
  fetchFeeTypes,
  fetchFeeStructure,
  fetchUpdateFeeType,
  verifyRazorpayPayment,
} from '../store/feesSlice'
import { getCrudPermissions } from '../utils/permissions'

const normalizeList = (resp) => (
  Array.isArray(resp?.items)
    ? resp.items
    : Array.isArray(resp)
      ? resp
      : Array.isArray(resp?.data)
        ? resp.data
        : []
)

const toSlug = (value) => (
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
)

const toHeader = (key) => (
  String(key || '')
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
)

const RAZORPAY_CHECKOUT_URL = 'https://checkout.razorpay.com/v1/checkout.js'

const getCurrentUser = (authUser) => authUser?.user ?? authUser

const getFinanceTabsFromPermissions = (authUser) => {
  const currentUser = getCurrentUser(authUser)
  const modules = Array.isArray(currentUser?.permissions)
    ? currentUser.permissions
    : Array.isArray(currentUser?.modules)
      ? currentUser.modules
      : []

  const financeModule = modules.find((moduleItem) => {
    const moduleName = toSlug(moduleItem?.module_name || moduleItem?.display_name || moduleItem?.name || '')
    return moduleName === 'finance' || moduleName.includes('finance') || moduleName.includes('fee')
  })

  const featureList = Array.isArray(financeModule?.features)
    ? financeModule.features
    : Array.isArray(financeModule?.module_features)
      ? financeModule.module_features
      : []

  const tabs = featureList.map((featureItem, index) => {
    const feature = featureItem?.feature ?? featureItem
    const label = featureItem?.feature_name || feature?.feature_name || feature?.display_name || feature?.name || ''
    const normalized = toSlug(label)

    if (!label) return null

    return {
      key: `finance-feature-${featureItem?.feature_id ?? feature?.id ?? index}-${normalized || index}`,
      label,
      supported: normalized.includes('fee'),
      mode: normalized.includes('fee-type') ? 'fee-types' : normalized.includes('fee') ? 'fee-structure' : 'unsupported',
    }
  }).filter(Boolean)

  if (tabs.length > 0) return tabs

  return [{ key: 'finance-fee-structure', label: 'Fee Structure', supported: true, mode: 'fee-structure' }]
}
const getSchoolId = (authUser) => {
  const currentUser = getCurrentUser(authUser)

  return (
    currentUser?.school_id
    ?? authUser?.school_id
    ?? currentUser?.school?.id
    ?? authUser?.school?.id
    ?? 1
  )
}

const resolveRazorpayOrder = (response) => (
  response?.order
  ?? response?.data
  ?? response
)

const loadRazorpayScript = () => new Promise((resolve, reject) => {
  if (typeof window === 'undefined') {
    reject(new Error('Window is not available.'))
    return
  }

  if (window.Razorpay) {
    resolve(window.Razorpay)
    return
  }

  const existingScript = document.querySelector(`script[src="${RAZORPAY_CHECKOUT_URL}"]`)
  if (existingScript) {
    existingScript.addEventListener('load', () => resolve(window.Razorpay), { once: true })
    existingScript.addEventListener('error', () => reject(new Error('Failed to load Razorpay checkout.')), { once: true })
    return
  }

  const script = document.createElement('script')
  script.src = RAZORPAY_CHECKOUT_URL
  script.async = true
  script.onload = () => resolve(window.Razorpay)
  script.onerror = () => reject(new Error('Failed to load Razorpay checkout.'))
  document.body.appendChild(script)
})

function FeesPage() {
  const dispatch = useDispatch()
  const { user } = useSelector((state) => state.auth)
  const financeTabs = useMemo(() => getFinanceTabsFromPermissions(user), [user])
  const [activeTab, setActiveTab] = useState('finance-fee-structure')
  const activeTabConfig = useMemo(
    () => financeTabs.find((tab) => tab.key === activeTab) || financeTabs[0] || { key: 'finance-fee-structure', label: 'Fee Structure', supported: true },
    [activeTab, financeTabs],
  )
  const permissions = useMemo(
    () => getCrudPermissions(user, {
      moduleMatchers: ['finance', 'fee'],
      featureMatchers: [activeTabConfig.label],
      featureMatchMode: 'exact',
    }),
    [activeTabConfig.label, user],
  )
  const currentUser = getCurrentUser(user)
  const schoolId = getSchoolId(user)
  const razorpayKeyId = 'rzp_test_SSbJqkb2l3Z0VD'
  const [feeData, setFeeData] = useState([])
  const [feeTypesData, setFeeTypesData] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPaying, setIsPaying] = useState(false)
  const [isCreatePopupOpen, setIsCreatePopupOpen] = useState(false)
  const [editingFeeType, setEditingFeeType] = useState(null)
  const [deleteFeeTypeTarget, setDeleteFeeTypeTarget] = useState(null)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState({})
  const [message, setMessage] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    fee_type: 'school',
    class_id: 0,
    section_id: 0,
    amount: 0,
    due_day: 0,
    fine_type: 'fixed',
    fine_amount: 0,
  })
  const [feeTypeFormData, setFeeTypeFormData] = useState({
    code: '',
    name: '',
    description: '',
  })
  const isSupportedFinanceTab = Boolean(activeTabConfig.supported)
  const isFeeStructureTab = activeTabConfig.mode === 'fee-structure'
  const isFeeTypesTab = activeTabConfig.mode === 'fee-types'

  useEffect(() => {
    if (financeTabs.length === 0) return
    if (!financeTabs.some((tab) => tab.key === activeTab)) {
      setActiveTab(financeTabs[0].key)
    }
  }, [activeTab, financeTabs])

  const refreshFeeStructure = async () => {
    if (!user?.access_token) return

    setIsLoading(true)
    setError('')
    try {
      const resp = await dispatch(fetchFeeStructure({
        access_token: user.access_token,
        school_id: schoolId,
        class_id: 1,
        fee_type_id: 1,
      })).unwrap()
      setFeeData(normalizeList(resp))
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to fetch fee structure.')
      setFeeData([])
    } finally {
      setIsLoading(false)
    }
  }

  const refreshFeeTypes = async () => {
    if (!user?.access_token) return

    setIsLoading(true)
    setError('')
    try {
      const resp = await dispatch(fetchFeeTypes({
        access_token: user.access_token,
      })).unwrap()
      setFeeTypesData(normalizeList(resp))
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to fetch fee types.')
      setFeeTypesData([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!isSupportedFinanceTab) {
      setFeeData([])
      setFeeTypesData([])
      return
    }

    if (isFeeTypesTab) {
      refreshFeeTypes()
      return
    }

    refreshFeeStructure()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, isFeeStructureTab, isFeeTypesTab, isSupportedFinanceTab, schoolId, user?.access_token])

  const validateForm = (values) => {
    const nextErrors = {}
    if (!values.name.trim()) nextErrors.name = 'Name is required.'
    if (!values.fee_type) nextErrors.fee_type = 'Fee type is required.'
    if (Number(values.class_id) < 0) nextErrors.class_id = 'Class id cannot be negative.'
    if (Number(values.section_id) < 0) nextErrors.section_id = 'Section id cannot be negative.'
    if (Number(values.amount) < 0) nextErrors.amount = 'Amount cannot be negative.'
    if (Number(values.due_day) < 0) nextErrors.due_day = 'Due day cannot be negative.'
    if (!values.fine_type.trim()) nextErrors.fine_type = 'Fine type is required.'
    if (Number(values.fine_amount) < 0) nextErrors.fine_amount = 'Fine amount cannot be negative.'
    return nextErrors
  }

  const validateFeeTypeForm = (values) => {
    const nextErrors = {}
    if (!String(values.code || '').trim()) nextErrors.code = 'Code is required.'
    if (!String(values.name || '').trim()) nextErrors.name = 'Name is required.'
    if (!String(values.description || '').trim()) nextErrors.description = 'Description is required.'
    return nextErrors
  }

  const handleInputChange = (event) => {
    const { name, value, type } = event.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }))
    setFormError((prev) => ({ ...prev, [name]: '', submit: '' }))
  }

  const handleFeeTypeInputChange = (event) => {
    const { name, value } = event.target
    setFeeTypeFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    setFormError((prev) => ({ ...prev, [name]: '', submit: '', editSubmit: '' }))
  }

  const openCreatePopup = () => {
    setIsCreatePopupOpen(true)
    setFormError({})
    setMessage('')
    if (isFeeTypesTab) {
      setFeeTypeFormData({ code: '', name: '', description: '' })
    }
  }

  const closeCreatePopup = () => {
    setIsCreatePopupOpen(false)
    setEditingFeeType(null)
    setFormError({})
    setFormData({
      name: '',
      fee_type: 1,
      class_id: 0,
      section_id: 0,
      amount: 0,
      due_day: 0,
      fine_type: 'fixed',
      fine_amount: 0,
    })
    setFeeTypeFormData({
      code: '',
      name: '',
      description: '',
    })
  }

  const handleCreateFee = async (event) => {
    event.preventDefault()
    const validationErrors = validateForm(formData)
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
      await dispatch(
        fetchCreateFeeStructure({
          ...formData,
          access_token: user.access_token,
        }),
      ).unwrap()
      closeCreatePopup()
      await refreshFeeStructure()
      setMessage('Fee structure created successfully.')
    } catch (err) {
      setFormError({
        submit: typeof err === 'string' ? err : 'Failed to create fee structure.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateFeeType = async (event) => {
    event.preventDefault()
    const validationErrors = validateFeeTypeForm(feeTypeFormData)
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
      await dispatch(
        fetchCreateFeeType({
          school_id: schoolId,
          code: String(feeTypeFormData.code || '').trim(),
          name: String(feeTypeFormData.name || '').trim(),
          description: String(feeTypeFormData.description || '').trim(),
          access_token: user.access_token,
        }),
      ).unwrap()
      closeCreatePopup()
      await refreshFeeTypes()
      setMessage('Fee type created successfully.')
    } catch (err) {
      setFormError({
        submit: typeof err === 'string' ? err : 'Failed to create fee type.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEditFeeTypePopup = (feeType) => {
    setEditingFeeType(feeType)
    setFeeTypeFormData({
      code: feeType?.code || '',
      name: feeType?.name || '',
      description: feeType?.description || '',
    })
    setFormError({})
    setMessage('')
    setIsCreatePopupOpen(true)
  }

  const handleUpdateFeeType = async (event) => {
    event.preventDefault()
    const validationErrors = validateFeeTypeForm(feeTypeFormData)
    if (Object.keys(validationErrors).length > 0) {
      setFormError(validationErrors)
      return
    }

    const feeTypeId = editingFeeType?.id ?? editingFeeType?.fee_type_id
    if (!user?.access_token || !feeTypeId) {
      setFormError({ editSubmit: 'Unable to update fee type.' })
      return
    }

    setIsSubmitting(true)
    try {
      await dispatch(
        fetchUpdateFeeType({
          fee_type_id: feeTypeId,
          code: String(feeTypeFormData.code || '').trim(),
          name: String(feeTypeFormData.name || '').trim(),
          description: String(feeTypeFormData.description || '').trim(),
          access_token: user.access_token,
        }),
      ).unwrap()
      closeCreatePopup()
      await refreshFeeTypes()
      setMessage('Fee type updated successfully.')
    } catch (err) {
      setFormError({
        editSubmit: typeof err === 'string' ? err : 'Failed to update fee type.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteFeeType = async () => {
    const feeTypeId = deleteFeeTypeTarget?.id ?? deleteFeeTypeTarget?.fee_type_id
    if (!user?.access_token || !feeTypeId) return
    if (actionLoadingId === String(feeTypeId)) return

    setActionLoadingId(String(feeTypeId))
    setMessage('')
    try {
      await dispatch(
        fetchDeleteFeeType({
          fee_type_id: feeTypeId,
          access_token: user.access_token,
        }),
      ).unwrap()
      setDeleteFeeTypeTarget(null)
      await refreshFeeTypes()
      setMessage('Fee type deleted successfully.')
    } catch (err) {
      setFormError({
        submit: typeof err === 'string' ? err : 'Failed to delete fee type.',
      })
    } finally {
      setActionLoadingId('')
    }
  }

  const handlePayExampleAmount = async () => {
    if (!user?.access_token) {
      setError('Missing access token. Please login again.')
      return
    }

    if (!razorpayKeyId) {
      setError('Missing Razorpay key. Add VITE_RAZORPAY_KEY_ID in your environment.')
      return
    }

    setIsPaying(true)
    setError('')
    setMessage('')
    const createBody = JSON.stringify({
      "school_id": 1,
      "student_id": 1,
      "fee_assignment_ids": [1, 2, 3],
      "amount": 50000,
       "currency": "INR",
       "receipt": "string",

    })
    //"http://127.0.0.1:8000/create-order"
    const data = await fetch(
      "http://127.0.0.1:8000/create-order", {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: createBody

    });
    const response = await data.json()

    console.log('create order res:- ', response)

    const options = {
      key: "rzp_test_SSbJqkb2l3Z0VD",
      // amount: 50000, // amount in paise (₹500)
      // currency: "INR",
      name: "My React App",
      description: "Test Payment",
      order_id: response.order_id,

      prefill: {
        name: "Karthik",
        email: "test@gmail.com",
        contact: "9999999999"
      },

      handler: function (response) {
        alert("Payment Successful!");
        setIsPaying(false)
        console.log("Payment response:", response);
        console.log("Payment ID:", response.razorpay_payment_id);
        console.log("Order ID:", response.razorpay_order_id);
        console.log("Signature:", response.razorpay_signature);
      },



      notes: {
        address: "React Razorpay Demo"
      },

      theme: {
        color: "#3399cc"
      }
    };

    const paymentObject = new window.Razorpay(options);
    paymentObject.open();

    // try {
    //   const razorpayOrderResponse = await dispatch(
    //     createRazorpayOrder({
    //       access_token: user.access_token,
    //       key: "rzp_test_SMi9MR5TYESMRb",
    //       amount: 500,
    //       currency: 'INR',
    //       receipt: `fees-demo-${Date.now()}`,
    //     }),
    //   ).unwrap()

    //   const order = resolveRazorpayOrder(razorpayOrderResponse)
    //   const Razorpay = await loadRazorpayScript()
    //   const razorpayOrderId = order?.razorpay_order_id || order?.id
    //   const paymentAmountPaise = Number(order?.amount_paise ?? order?.amount ?? 50000)
    //   const paymentAmountRupees = Number(order?.amount_rupees ?? paymentAmountPaise / 100)
    //   const paymentKeyId = order?.key_id || razorpayKeyId

    //   if (!Razorpay) {
    //     throw new Error('Razorpay checkout is unavailable.')
    //   }

    //   if (!razorpayOrderId) {
    //     throw new Error('Order id was not returned by the payment API.')
    //   }

    //   if (!paymentKeyId) {
    //     throw new Error('Razorpay key id was not returned by the payment API.')
    //   }

    //   const paymentObject = new Razorpay({
    //     key: paymentKeyId,
    //     amount: paymentAmountPaise,
    //     currency: order?.currency || 'INR',
    //     name: 'SMS Portal',
    //     description: order?.receipt || 'Finance example payment',
    //     order_id: razorpayOrderId,
    //     prefill: {
    //       name: order?.student_name || [currentUser?.first_name, currentUser?.last_name].filter(Boolean).join(' ').trim() || currentUser?.name || '',
    //       email: currentUser?.email || '',
    //       contact: currentUser?.phone || currentUser?.mobile || '',
    //     },
    //     notes: {
    //       module: 'finance',
    //       example_amount: String(paymentAmountRupees),
    //       payment_order_id: String(order?.payment_order_id ?? ''),
    //       school_name: order?.school_name || '',
    //     },
    //     theme: {
    //       color: '#1f6feb',
    //     },
    //     handler: async (response) => {
    //       try {
    //         await dispatch(
    //           verifyRazorpayPayment({
    //             access_token: user.access_token,
    //             payload: {
    //               payment_order_id: order?.payment_order_id,
    //               razorpay_order_id: response.razorpay_order_id,
    //               razorpay_payment_id: response.razorpay_payment_id,
    //               razorpay_signature: response.razorpay_signature,
    //             },
    //           }),
    //         ).unwrap()

    //         setMessage(`Payment of Rs. ${paymentAmountRupees} completed and verified successfully.`)
    //       } catch (err) {
    //         setError(typeof err === 'string' ? err : 'Payment completed, but verification failed.')
    //       }
    //     },
    //     modal: {
    //       ondismiss: () => {
    //         setMessage('Payment popup closed.')
    //       },
    //     },
    //   })

    //   paymentObject.on('payment.failed', (response) => {
    //     const failureReason = response?.error?.description || response?.error?.reason || 'Payment failed.'
    //     setError(failureReason)
    //   })

    //   paymentObject.open()
    // } catch (err) {
    //   setError(typeof err === 'string' ? err : err?.message || 'Unable to start payment.')
    // } finally {
    //   setIsPaying(false)
    // }
  }

  const createOrderId = async () => {

  }

  const feeStructureColumns = useMemo(() => {
    const sample = feeData[0]
    if (!sample || typeof sample !== 'object') return []
    return Object.keys(sample).map((key) => ({
      key,
      header: toHeader(key),
    }))
  }, [feeData])

  const feeTypeColumns = useMemo(() => {
    const columns = [
      { key: 'id', header: 'Fee Type Id' },
      { key: 'code', header: 'Code' },
      { key: 'name', header: 'Name' },
      // { key: 'description', header: 'Description' },
    ]

    if (permissions.canUpdate || permissions.canDelete) {
      columns.push({
        key: 'action',
        header: 'Action',
        render: (item) => (
          <div className="role-management-table-actions">
            {permissions.canUpdate && (
                <button
                  type="button"
                  className="role-management-action-btn role-management-action-btn-edit"
                  onClick={() => openEditFeeTypePopup(item)}
                  aria-label={`Edit ${item?.name || 'fee type'}`}
                  title="Edit"
                >
                  <EditActionIcon />
                </button>
            )}
            {permissions.canDelete && (
              <button
                type="button"
                  className="role-management-action-btn role-management-action-btn-delete"
                  onClick={() => setDeleteFeeTypeTarget(item)}
                  disabled={actionLoadingId === String(item?.id ?? item?.fee_type_id)}
                  aria-label={`Delete ${item?.name || 'fee type'}`}
                  title="Delete"
                >
                  <DeleteActionIcon />
                </button>
            )}
          </div>
        ),
      })
    }

    return columns
  }, [actionLoadingId, permissions.canDelete, permissions.canUpdate])

  return (
    <section className="role-management-wrap">
      <div className="role-management-card">
        <div className="role-management-head">
          <div className="role-management-head-row">
            <h2 className="role-management-title">{activeTabConfig.label}</h2>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {isFeeStructureTab && (
                <button
                  type="button"
                  className="role-management-open-create-btn"
                  onClick={handlePayExampleAmount}
                  disabled={isPaying}
                >
                  {isPaying ? 'Opening Razorpay...' : 'Pay 500'}
                </button>
              )}
              {isSupportedFinanceTab && permissions.canCreate && (
                <button
                  type="button"
                  className="role-management-open-create-btn"
                  onClick={openCreatePopup}
                >
                  {isFeeTypesTab ? 'Create Fee Type' : 'Create Fee'}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="role-management-tabs">
          {financeTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`role-management-tab-btn ${activeTab === tab.key ? 'role-management-tab-btn-active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {isLoading && isFeeStructureTab && <p className="role-management-info">Loading fee structure...</p>}
        {isLoading && isFeeTypesTab && <p className="role-management-info">Loading fee types...</p>}
        {error && <p className="role-management-error">{error}</p>}
        {formError.submit && <p className="role-management-field-error">{formError.submit}</p>}
        {message && <p className="role-management-success">{message}</p>}
        {!isLoading && !error && !isSupportedFinanceTab && (
          <p className="role-management-info">{`${activeTabConfig.label} tab is available from the login response, but this screen is not configured yet.`}</p>
        )}
        {!isLoading && !error && isFeeStructureTab && feeData.length === 0 && (
          <p className="role-management-info">No fee structure available.</p>
        )}
        {!isLoading && !error && isFeeTypesTab && feeTypesData.length === 0 && (
          <p className="role-management-info">No fee types available.</p>
        )}

        {!isLoading && !error && isFeeStructureTab && feeData.length > 0 && (
          <CustomTable
            columns={feeStructureColumns}
            data={feeData}
            rowKey={(item, index) => item?.id ?? index}
            wrapperClassName="role-management-table-wrap"
            tableClassName="role-management-table"
            emptyMessage="No fee structure available."
          />
        )}
        {!isLoading && !error && isFeeTypesTab && feeTypesData.length > 0 && (
          <CustomTable
            columns={feeTypeColumns}
            data={feeTypesData}
            rowKey={(item, index) => item?.id ?? item?.fee_type_id ?? index}
            wrapperClassName="role-management-table-wrap"
            tableClassName="role-management-table"
            emptyMessage="No fee types available."
          />
        )}
      </div>

      {isCreatePopupOpen && isSupportedFinanceTab && permissions.canCreate && (
        <div className="custom-popup-backdrop" role="presentation">
          <div className="custom-popup role-management-create-popup" role="dialog" aria-modal="true" aria-labelledby="create-fee-title">
            <h3 id="create-fee-title" className="custom-popup-title">{editingFeeType ? 'Edit Fee Type' : isFeeTypesTab ? 'Create Fee Type' : 'Create Fee'}</h3>
            <form className="role-management-form" onSubmit={isFeeTypesTab ? (editingFeeType ? handleUpdateFeeType : handleCreateFeeType) : handleCreateFee}>
              {isFeeTypesTab && (
                <>
                  

                  <div className="role-management-field">
                    <label htmlFor="fee-type-name" className="role-management-label">Fee Type Name</label>
                    <input
                      id="fee-type-name"
                      name="name"
                      type="text"
                      className="role-management-input"
                      value={feeTypeFormData.name}
                      onChange={handleFeeTypeInputChange}
                    />
                    {formError.name && <p className="role-management-field-error">{formError.name}</p>}
                  </div>
                  <div className="role-management-field">
                    <label htmlFor="fee-type-code" className="role-management-label">Fee Type Code</label>
                    <input
                      id="fee-type-code"
                      name="code"
                      type="text"
                      className="role-management-input"
                      value={feeTypeFormData.code}
                      onChange={handleFeeTypeInputChange}
                    />
                    {formError.code && <p className="role-management-field-error">{formError.code}</p>}
                  </div>

                  <div className="role-management-field">
                    <label htmlFor="fee-type-description" className="role-management-label">Description</label>
                    <textarea
                      id="fee-type-description"
                      name="description"
                      className="role-management-input"
                      value={feeTypeFormData.description}
                      onChange={handleFeeTypeInputChange}
                      rows={4}
                    />
                    {formError.description && <p className="role-management-field-error">{formError.description}</p>}
                  </div>
                </>
              )}

              {!isFeeTypesTab && (
                <>
                  <div className="role-management-field">
                    <label htmlFor="fee-name" className="role-management-label">Name</label>
                    <input id="fee-name" name="name" type="text" className="role-management-input" value={formData.name} onChange={handleInputChange} />
                    {formError.name && <p className="role-management-field-error">{formError.name}</p>}
                  </div>

                  <div className="role-management-field">
                    <label htmlFor="fee-fee_type" className="role-management-label">Fee Type</label>
                    <input id="fee-fee_type" name="fee_type" type="number" className="role-management-input" value={formData.fee_type} onChange={handleInputChange} />
                    {formError.fee_type && <p className="role-management-field-error">{formError.fee_type}</p>}
                  </div>

                  <div className="role-management-field">
                    <label htmlFor="fee-class_id" className="role-management-label">Class Id</label>
                    <input id="fee-class_id" name="class_id" type="number" className="role-management-input" value={formData.class_id} onChange={handleInputChange} />
                    {formError.class_id && <p className="role-management-field-error">{formError.class_id}</p>}
                  </div>

                  <div className="role-management-field">
                    <label htmlFor="fee-section_id" className="role-management-label">Section Id</label>
                    <input id="fee-section_id" name="section_id" type="number" className="role-management-input" value={formData.section_id} onChange={handleInputChange} />
                    {formError.section_id && <p className="role-management-field-error">{formError.section_id}</p>}
                  </div>

                  <div className="role-management-field">
                    <label htmlFor="fee-amount" className="role-management-label">Amount</label>
                    <input id="fee-amount" name="amount" type="number" className="role-management-input" value={formData.amount} onChange={handleInputChange} />
                    {formError.amount && <p className="role-management-field-error">{formError.amount}</p>}
                  </div>

                  <div className="role-management-field">
                    <label htmlFor="fee-due_day" className="role-management-label">Due Day</label>
                    <input id="fee-due_day" name="due_day" type="number" className="role-management-input" value={formData.due_day} onChange={handleInputChange} />
                    {formError.due_day && <p className="role-management-field-error">{formError.due_day}</p>}
                  </div>

                  <div className="role-management-field">
                    <label htmlFor="fee-fine_type" className="role-management-label">Fine Type</label>
                    <input id="fee-fine_type" name="fine_type" type="text" className="role-management-input" value={formData.fine_type} onChange={handleInputChange} />
                    {formError.fine_type && <p className="role-management-field-error">{formError.fine_type}</p>}
                  </div>

                  <div className="role-management-field">
                    <label htmlFor="fee-fine_amount" className="role-management-label">Fine Amount</label>
                    <input id="fee-fine_amount" name="fine_amount" type="number" className="role-management-input" value={formData.fine_amount} onChange={handleInputChange} />
                    {formError.fine_amount && <p className="role-management-field-error">{formError.fine_amount}</p>}
                  </div>
                </>
              )}

              <div className="role-management-form-actions">
                <button type="submit" className="role-management-create-btn" disabled={isSubmitting}>
                  {isSubmitting ? 'Please wait...' : editingFeeType ? 'Update Fee Type' : isFeeTypesTab ? 'Create Fee Type' : 'Create Fee'}
                </button>
                <button type="button" className="role-management-cancel-btn" onClick={closeCreatePopup}>Cancel</button>
              </div>
              {formError.submit && <p className="role-management-field-error">{formError.submit}</p>}
              {formError.editSubmit && <p className="role-management-field-error">{formError.editSubmit}</p>}
            </form>
          </div>
        </div>
      )}

      <CustomPopup
        isOpen={Boolean(deleteFeeTypeTarget)}
        title="Delete Fee Type"
        message={`Are you sure you want to delete "${deleteFeeTypeTarget?.name || 'this fee type'}"?`}
        onConfirm={handleDeleteFeeType}
        confirmText={actionLoadingId === String(deleteFeeTypeTarget?.id ?? deleteFeeTypeTarget?.fee_type_id) ? 'Deleting...' : 'Delete'}
        onCancel={() => setDeleteFeeTypeTarget(null)}
        cancelText="Cancel"
        showCancel
        isDanger
        titleId="delete-fee-type-title"
      />
    </section>
  )
}

export default FeesPage
