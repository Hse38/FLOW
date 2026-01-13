'use client'

import { memo, useCallback } from 'react'
import { EdgeProps, getBezierPath, getSmoothStepPath, EdgeLabelRenderer, BaseEdge } from 'reactflow'

// Manual Edge Component - Full user control with bend points
const ManualEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  selected,
  data,
}: EdgeProps) => {
  // Use step path for orthogonal (90-degree) segments
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 0, // Sharp 90-degree corners
  })

  // If edge has custom waypoints (bend points), use them
  const waypoints = data?.waypoints || []
  
  // Build path with waypoints if they exist
  let finalPath = edgePath
  if (waypoints.length > 0) {
    const pathParts: string[] = []
    pathParts.push(`M ${sourceX} ${sourceY}`)
    
    waypoints.forEach((point: { x: number; y: number }, index: number) => {
      if (index === 0) {
        // First waypoint - horizontal or vertical line from source
        const dx = Math.abs(point.x - sourceX)
        const dy = Math.abs(point.y - sourceY)
        if (dx > dy) {
          pathParts.push(`L ${point.x} ${sourceY}`)
          pathParts.push(`L ${point.x} ${point.y}`)
        } else {
          pathParts.push(`L ${sourceX} ${point.y}`)
          pathParts.push(`L ${point.x} ${point.y}`)
        }
      } else {
        const prevPoint = waypoints[index - 1]
        const dx = Math.abs(point.x - prevPoint.x)
        const dy = Math.abs(point.y - prevPoint.y)
        if (dx > dy) {
          pathParts.push(`L ${point.x} ${prevPoint.y}`)
          pathParts.push(`L ${point.x} ${point.y}`)
        } else {
          pathParts.push(`L ${prevPoint.x} ${point.y}`)
          pathParts.push(`L ${point.x} ${point.y}`)
        }
      }
    })
    
    // Final segment to target
    const lastPoint = waypoints[waypoints.length - 1]
    const dx = Math.abs(targetX - lastPoint.x)
    const dy = Math.abs(targetY - lastPoint.y)
    if (dx > dy) {
      pathParts.push(`L ${targetX} ${lastPoint.y}`)
      pathParts.push(`L ${targetX} ${targetY}`)
    } else {
      pathParts.push(`L ${lastPoint.x} ${targetY}`)
      pathParts.push(`L ${targetX} ${targetY}`)
    }
    
    finalPath = pathParts.join(' ')
  }

  return (
    <>
      <BaseEdge
        id={id}
        path={finalPath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: selected ? 3 : 2,
          stroke: selected ? '#3b82f6' : style.stroke || '#60a5fa',
        }}
      />
      {selected && waypoints.length > 0 && (
        <EdgeLabelRenderer>
          {waypoints.map((point: { x: number; y: number }, index: number) => (
            <div
              key={`waypoint-${index}`}
              style={{
                position: 'absolute',
                transform: `translate(-50%, -50%) translate(${point.x}px,${point.y}px)`,
                pointerEvents: 'all',
                cursor: 'move',
              }}
              className="nodrag nopan"
            >
              <div
                style={{
                  width: 12,
                  height: 12,
                  background: '#3b82f6',
                  border: '2px solid white',
                  borderRadius: '50%',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                }}
              />
            </div>
          ))}
        </EdgeLabelRenderer>
      )}
    </>
  )
}

export default memo(ManualEdge)
