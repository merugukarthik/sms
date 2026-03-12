import { useRef } from 'react'
import useOutsideClick from './useOutsideClick'

function CustomPopup({
  isOpen,
  title,
  message,
  onConfirm,
  confirmText = 'OK',
  onCancel,
  cancelText = 'Cancel',
  showCancel = false,
  isDanger = false,
  titleId = 'custom-popup-title',
  children,
  popupClassName = '',
  onClose,
}) {
  const closePopupRef = useRef(null)
  useOutsideClick(closePopupRef, () => {
    if (isOpen && onClose) {
      onClose()
    }
  })

  if (!isOpen) {
    return null
  }

  const hasCustomContent = Boolean(children)

  return (
    <div className="custom-popup-backdrop" role="presentation">
      <div
        ref={closePopupRef}
        className={`custom-popup ${popupClassName}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        {onClose && (
          <button
            type="button"
            className="custom-popup-close-btn"
            onClick={onClose}
            aria-label="Close popup"
          >
            x
          </button>
        )}
        <h3 id={titleId} className="custom-popup-title">{title}</h3>
        {hasCustomContent ? (
          children
        ) : (
          <>
            <p className="custom-popup-message">{message}</p>
            <div className={`custom-popup-actions ${showCancel ? '' : 'custom-popup-actions-single'}`.trim()}>
              {showCancel && (
                <button
                  type="button"
                  className="otp-back-btn custom-popup-btn"
                  onClick={onCancel}
                >
                  {cancelText}
                </button>
              )}
              <button
                type="button"
                className={`login-submit-btn custom-popup-btn ${isDanger ? 'custom-popup-danger-btn' : ''}`.trim()}
                onClick={onConfirm}
              >
                {confirmText}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default CustomPopup
