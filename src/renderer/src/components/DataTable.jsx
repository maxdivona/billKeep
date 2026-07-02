import { Fragment } from 'react'

export default function DataTable({
  headers,
  data,
  loading,
  renderRow,
  renderSkeletonRow,
  skeletonCount = 3,
  emptyMessage = 'Nessun dato disponibile.'
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-outline-variant text-on-surface-variant font-label-sm text-label-sm">
            {headers.map((header, idx) => {
              const text = typeof header === 'string' ? header : header.text
              const align = typeof header === 'object' && header.align ? header.align : 'left'
              const className =
                typeof header === 'object' && header.className ? header.className : ''

              let alignClass = ''
              if (align === 'right') alignClass = 'text-right'
              if (align === 'center') alignClass = 'text-center'

              return (
                <th
                  key={idx}
                  className={`py-sm px-sm font-semibold uppercase ${alignClass} ${className}`}
                >
                  {text}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody className="font-body-md text-body-md divide-y divide-outline-variant">
          {loading && data.length === 0 ? (
            Array.from({ length: skeletonCount }).map((_, idx) => {
              if (renderSkeletonRow) {
                return <Fragment key={idx}>{renderSkeletonRow(idx)}</Fragment>
              }
              return (
                <tr key={idx}>
                  {headers.map((header, hIdx) => {
                    const align = typeof header === 'object' && header.align ? header.align : 'left'
                    let widthClass = 'w-24'
                    if (align === 'right') {
                      widthClass = 'w-16 ml-auto'
                    } else if (align === 'center') {
                      widthClass = 'w-16 mx-auto'
                    }
                    return (
                      <td key={hIdx} className="py-sm px-sm">
                        <div
                          className={`h-4 bg-surface-container rounded animate-pulse ${widthClass}`}
                        ></div>
                      </td>
                    )
                  })}
                </tr>
              )
            })
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="py-8 text-center text-on-surface-variant">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item, idx) => (
              <Fragment key={item.id || idx}>{renderRow(item, idx)}</Fragment>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
