import { useMemo, useState } from 'react';
import type { MasterClass, MasterSubclass } from '../../services/compendium/fiveETools/types';
import './ClassDetailView.css';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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

        <main className="class-timeline">
          {levels.map((level) => (
            <div key={level} className="class-timeline-level">
              <div className="class-timeline-level__header">
                <span className="class-timeline-level__badge">{level}</span>
                <div className="class-timeline-level__line" />
              </div>
              
              {progressionByLevel[level].map((feature, idx) => (
                <div key={`${feature.name}-${idx}`} className="class-timeline-feature">
                  <h4>
                    {feature.name}
                    {feature.sourceType === 'subclass' && (
                      <span className="class-timeline-feature__source">Subclass</span>
                    )}
                  </h4>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {feature.desc}
                  </ReactMarkdown>
                </div>
              ))}
            </div>
          ))}
        </main>
      </div>
    </div>
  );
}
