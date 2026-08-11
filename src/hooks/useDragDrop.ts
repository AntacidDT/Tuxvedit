import { useCallback, useRef, useState } from 'react';

export function useDragDrop() {
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; elementX: number; elementY: number } | null>(null);

  const onDragStart = useCallback((e: React.MouseEvent, initialX: number, initialY: number) => {
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      elementX: initialX,
      elementY: initialY,
    };
  }, []);

  const onDragMove = useCallback((e: MouseEvent) => {
    if (!dragRef.current) return null;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    return {
      x: dragRef.current.elementX + dx,
      y: dragRef.current.elementY + dy,
    };
  }, []);

  const onDragEnd = useCallback(() => {
    setIsDragging(false);
    dragRef.current = null;
  }, []);

  return { isDragging, onDragStart, onDragMove, onDragEnd };
}

export function useTimelineDrag() {
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{
    startX: number;
    clipId: string;
    originalStartTime: number;
    originalTrackId: string;
  } | null>(null);

  const startDrag = useCallback((e: React.MouseEvent, clipId: string, startTime: number, trackId: string) => {
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      clipId,
      originalStartTime: startTime,
      originalTrackId: trackId,
    };
  }, []);

  const getDragOffset = useCallback((e: MouseEvent, pixelsPerSecond: number) => {
    if (!dragRef.current) return null;
    const dx = e.clientX - dragRef.current.startX;
    return {
      clipId: dragRef.current.clipId,
      timeOffset: dx / pixelsPerSecond,
      originalStartTime: dragRef.current.originalStartTime,
      originalTrackId: dragRef.current.originalTrackId,
    };
  }, []);

  const endDrag = useCallback(() => {
    setIsDragging(false);
    dragRef.current = null;
  }, []);

  return { isDragging, startDrag, getDragOffset, endDrag };
}
