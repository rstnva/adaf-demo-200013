"use client";
// Grid drag & drop con persistencia para Wall Street Pulse
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { EtfFlowWidget } from './widgets/EtfFlowWidget';
import { RatesFxWidget } from './widgets/RatesFxWidget';
import { IndicesBetaWidget } from './widgets/IndicesBetaWidget';
import { CalendarCatalystWidget } from './widgets/CalendarCatalystWidget';
import { WspsScoreWidget } from './widgets/WspsScoreWidget';
import { EventBannerWidget } from './widgets/EventBannerWidget';

const WIDGETS = [
  { key: 'etf', component: <EtfFlowWidget /> },
  { key: 'indices', component: <IndicesBetaWidget /> },
  { key: 'rates', component: <RatesFxWidget /> },
  { key: 'wsps', component: <WspsScoreWidget /> },
  { key: 'calendar', component: <CalendarCatalystWidget /> },
  { key: 'event', component: <EventBannerWidget /> },
];

const STORAGE_KEY = 'wsp-layout-v1';

function SortableItem({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition } as React.CSSProperties;
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}

export function WallStreetPulseGrid() {
  const [order, setOrder] = useState<string[]>([]);
  const sensors = useSensors(useSensor(PointerSensor));
  const items = useMemo(() => (order.length ? order : WIDGETS.map(w => w.key)), [order]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) setOrder(JSON.parse(saved));
    else setOrder(WIDGETS.map(w => w.key));
  }, []);

  const persist = useCallback((next: string[]) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const onDragEnd = useCallback((event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setOrder(prev => {
      const oldIndex = prev.indexOf(active.id);
      const newIndex = prev.indexOf(over.id);
      const next = arrayMove(prev, oldIndex, newIndex);
      persist(next);
      return next;
    });
  }, [persist]);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <div className="wsp-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((key) => {
            const w = WIDGETS.find(w => w.key === key);
            if (!w) return null;
            return (
              <SortableItem key={key} id={key}>
                <div>{w.component}</div>
              </SortableItem>
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}
