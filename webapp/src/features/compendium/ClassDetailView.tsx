import { useMemo, useState } from 'react';
import type { MasterClass, MasterSubclass } from '../../services/compendium/fiveETools/types';
import './ClassDetailView.css';
import { AccordionContainer, AccordionGroup, AccordionItem } from '../../shared/components/Accordion/Accordion';

export interface ClassDetailViewProps {
  masterClass: MasterClass;
  availableSubclasses: MasterSubclass[];
}

interface ProgressionFeature {
  name: string;
  desc: string;
  level: number;
  sourceType: 'class' | 'subclass';
}

function useClassProgression(masterClass: MasterClass, activeSubclass: MasterSubclass | null) {
  return useMemo(() => {
    const combined: ProgressionFeature[] = [];

    if (masterClass.features) {
      for (const f of masterClass.features) {
        combined.push({
          name: f.name,
          desc: f.desc,
          level: f.level || 1,
          sourceType: 'class',
        });
      }
    }

    if (activeSubclass && activeSubclass.features) {
      for (const f of activeSubclass.features) {
        combined.push({
          name: f.name,
          desc: f.desc,
          level: f.level || 1,
          sourceType: 'subclass',
        });
      }
    }

    // Sort chronologically by level
    combined.sort((a, b) => a.level - b.level);

    // Group by level
    const byLevel: Record<number, ProgressionFeature[]> = {};
    for (const feat of combined) {
      if (!byLevel[feat.level]) {
        byLevel[feat.level] = [];
      }
      byLevel[feat.level].push(feat);
    }

    return byLevel;
  }, [masterClass, activeSubclass]);
}

export default function ClassDetailView({ masterClass, availableSubclasses }: ClassDetailViewProps) {
  const [activeSubclassId, setActiveSubclassId] = useState<string | null>(null);

  const activeSubclass = useMemo(() => {
    if (!activeSubclassId) return null;
    return availableSubclasses.find((sc) => sc.id === activeSubclassId) || null;
  }, [activeSubclassId, availableSubclasses]);

  const progressionByLevel = useClassProgression(masterClass, activeSubclass);
  const levels = Object.keys(progressionByLevel)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div className="class-detail-view">
      <div className="class-detail-view__header">
        <h2 className="class-detail-view__title">{masterClass.name}</h2>
        <div className="class-detail-view__tags">
          <span className="class-detail-view__tag">{masterClass.source}</span>
          {masterClass.hitDice && (
            <span className="class-detail-view__tag">Hit Dice: {masterClass.hitDice}</span>
          )}
        </div>
      </div>

      <div className="class-detail-view__layout">
        <aside className="class-subclass-sidebar">
          <h3>Subclasses</h3>
          <div className="class-subclass-list">
            <button
              type="button"
              className={`class-subclass-btn ${!activeSubclassId ? 'is-active' : ''}`}
              onClick={() => setActiveSubclassId(null)}
            >
              None (Base Class Only)
            </button>
            {availableSubclasses.map((sc) => (
              <button
                key={sc.id}
                type="button"
                className={`class-subclass-btn ${activeSubclassId === sc.id ? 'is-active' : ''}`}
                onClick={() => setActiveSubclassId(sc.id)}
              >
                {sc.shortName || sc.name}
              </button>
            ))}
          </div>
        </aside>

        <main className="class-timeline" style={{ width: '100%' }}>
          <AccordionContainer>
            {levels.map((level) => {
              const featuresAtLevel = progressionByLevel[level];
              const featureNames = featuresAtLevel.map(f => f.name).join(', ');
              
              return (
                <AccordionGroup key={level} title={`Level ${level} - ${featureNames}`}>
                  {featuresAtLevel.map((feature, idx) => (
                    <AccordionItem 
                      key={`${feature.name}-${idx}`} 
                      summary={
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span>{feature.name}</span>
                          {feature.sourceType === 'subclass' && (
                            <span className="badge badge-outline text-xs" style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}>Subclass</span>
                          )}
                        </div>
                      }
                    >
                      <div 
                        className="text-sm max-w-prose leading-relaxed whitespace-pre-wrap"
                        style={{ color: 'var(--text-secondary)' }}
                        dangerouslySetInnerHTML={{ __html: feature.desc }}
                      />
                    </AccordionItem>
                  ))}
                </AccordionGroup>
              );
            })}
          </AccordionContainer>
        </main>
      </div>
    </div>
  );
}
