function CustomTable({
  columns = [],
  data = [],
  rowKey = 'id',
  wrapperClassName = 'custom-table-wrap',
  tableClassName = 'custom-table',
  emptyMessage = 'No records found.',
  emptyRowClassName = 'custom-table-empty-row',
  emptyCellClassName = 'custom-table-empty-cell',
}) {

  console.log('table data:- ', data)
  const resolveRowKey = (row, index) => {
    if (typeof rowKey === 'function') {
      return rowKey(row, index)
    }

    return row?.[rowKey] ?? index
  }
  const onlyYears = (start_date, end_date) => {
    const trimmedYeear = new Date(start_date).getFullYear() + " - " + new Date(end_date).getFullYear()
    return trimmedYeear
  }
  const normalizeCellValue = (value) => {
    console.log('normalize cell value:- ',value)
    if (value === null || value === undefined || value === '') return '-'
    if (Array.isArray(value)) {
      const mapped = value
        .map((item) => normalizeCellValue(item))
        .filter((item) => item !== '-')
      return mapped.length > 0 ? mapped.join(', ') : '-'
    }
    if (typeof value === 'object') {
      if (typeof value.display_name === 'string' && value.display_name.trim()) return value.display_name
      if (typeof value.name === 'string' && value.name.trim()) return value.name
      try {
        return JSON.stringify(value)
      } catch {
        return '-'
      }
    }
    return value
  }

  return (
    <div className={wrapperClassName}>
      <table className={tableClassName}>
        <thead>
          <tr>
            {columns.map((column, index) => (
              <th key={column?.key ?? index}>{column?.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr className={emptyRowClassName}>
              <td className={emptyCellClassName} colSpan={columns.length}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr key={resolveRowKey(row, rowIndex)}>
                {console.log('columns:- ', columns)}
                {console.log('columns data:- ', data)}
                {columns.map((column, colIndex) => (
                  <td key={column?.key ?? colIndex}>
                    {typeof column?.render === 'function'
                      ? column.render(row, rowIndex)
                      : (() => {
                        //  const value =  row?.[column?.key]
                        const value = column?.key === "academic_year" ?
                          onlyYears(row?.start_date, row?.end_date) :
                          row?.[column?.key]
                        return normalizeCellValue(value)
                      })()}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

export default CustomTable
