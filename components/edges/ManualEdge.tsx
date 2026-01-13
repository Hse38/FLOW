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
  // If edge has custom waypoints (bend points), use them
  const waypoints = data?.waypoints || []
  
  // Build path with waypoints if they exist - STRICT ORTHOGONAL (only horizontal/vertical)
  let finalPath = ''
  if (waypoints.length > 0) {
    const pathParts: string[] = []
    let currentX = sourceX
    let currentY = sourceY
    
    pathParts.push(`M ${currentX} ${currentY}`)
    
    waypoints.forEach((point: { x: number; y: number }, index: number) => {
      // STRICT ORTHOGONAL: Always move horizontally first, then vertically (or vice versa)
      // Check which direction to move first based on source position
      const dx = Math.abs(point.x - currentX)
      const dy = Math.abs(point.y - currentY)
      
      // If horizontal distance is greater, move horizontally first
      if (dx > dy) {
        // Move horizontally first
        pathParts.push(`L ${point.x} ${currentY}`)
        // Then move vertically
        pathParts.push(`L ${point.x} ${point.y}`)
      } else {
        // Move vertically first
        pathParts.push(`L ${currentX} ${point.y}`)
        // Then move horizontally
        pathParts.push(`L ${point.x} ${point.y}`)
      }
      
      currentX = point.x
      currentY = point.y
    })
    
    // Final segment to target - STRICT ORTHOGONAL
    const lastPoint = waypoints[waypoints.length - 1]
    const finalDx = Math.abs(targetX - lastPoint.x)
    const finalDy = Math.abs(targetY - lastPoint.y)
    
    if (finalDx > finalDy) {
      // Move horizontally first, then vertically
      pathParts.push(`L ${targetX} ${lastPoint.y}`)
      pathParts.push(`L ${targetX} ${targetY}`)
    } else {
      // Move vertically first, then horizontally
      pathParts.push(`L ${lastPoint.x} ${targetY}`)
      pathParts.push(`L ${targetX} ${targetY}`)
    }
    
    finalPath = pathParts.join(' ')
  } else {
    // No waypoints - use smooth step path with sharp corners for strict orthogonal
    const [path] = getSmoothStepPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
      borderRadius: 0, // Sharp 90-degree corners - STRICT ORTHOGONAL
    })
    finalPath = path
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
