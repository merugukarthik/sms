import { useMemo } from 'react'
import { useParams } from 'react-router-dom'

const toTitleCase = (value = '') => value
  .split('-')
  .filter(Boolean)
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(' ')

function ModulePage() {
  const { moduleName = '', featureName = '' } = useParams()

  const title = useMemo(() => {
    if (!moduleName) return 'Module'
    const moduleTitle = toTitleCase(moduleName)
    if (!featureName) return moduleTitle
    return `${moduleTitle} / ${toTitleCase(featureName)}`
  }, [featureName, moduleName])

  return (
    <>
      <h2>{title}</h2>
      <p>This is the {title.toLowerCase()} page.</p>
    </>
  )
}

export default ModulePage
