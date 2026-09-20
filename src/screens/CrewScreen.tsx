import { useState, useMemo, useRef, useCallback } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useStore } from '../store';
import { CREW_MEMBERS, CREW_PICK_COUNT, type CrewMember } from '../config/crew';
import { CREW_MODIFIERS } from '../config/scoring';
import { COPY } from '../config/copy';
import { generateCodename } from '../utils/seededRandom';
import { EditorModal } from '../editor/EditorModal';
import { DISGUISE_TOOLS } from '../editor/toolConfigs';
import type { ImageEditorSaveResult } from '@unlayer/react-image-editor';
import './CrewScreen.css';

export function CrewScreen() {
  const setCrew = useStore((s) => s.setCrew);
  const setScreen = useStore((s) => s.setScreen);
  const setCodename = useStore((s) => s.setCodename);
  const goBack = useStore((s) => s.goBack);
  const target = useStore((s) => s.target);
  const customCrewPortraits = useStore((s) => s.customCrewPortraits);
  const setCustomCrewPortrait = useStore((s) => s.setCustomCrewPortrait);
  const addToast = useStore((s) => s.addToast);
  const containerRef = useRef<HTMLDivElement>(null);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingMember, setEditingMember] = useState<CrewMember | null>(null);

  useGSAP(() => {
    const ctx = containerRef.current;
    if (!ctx) return;

    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo(ctx.querySelector('.screen-header'),
        { y: -20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, ease: 'power4.out' },
      );

      gsap.fromTo(ctx.querySelectorAll('.crew-card'),
        { y: 50, opacity: 0, scale: 0.95 },
        {
          y: 0, opacity: 1, scale: 1,
          duration: 0.6, stagger: 0.08, ease: 'power3.out', delay: 0.15,
        },
      );

      gsap.fromTo(ctx.querySelector('.crew-sidebar'),
        { x: 30, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.6, ease: 'power3.out', delay: 0.4 },
      );
    });
  }, { scope: containerRef });

  const toggleMember = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < CREW_PICK_COUNT) {
        next.add(id);
      }
      return next;
    });
  };

  const activeModifiers = useMemo(() => {
    return CREW_MEMBERS.filter((m) => selected.has(m.id)).map((m) => ({
      name: m.name,
      role: m.role,
      desc: CREW_MODIFIERS[m.modifierId].description,
    }));
  }, [selected]);

  const handleContinue = () => {
    const crew = CREW_MEMBERS.filter((m) => selected.has(m.id));
    setCrew(crew);
    const seed = Array.from(selected).sort().join('').length + (target?.id.length ?? 0);
    setCodename(generateCodename(seed * 12345 + Date.now()));
    setScreen('infiltration');
  };

  const handleDisguiseSave = useCallback(
    (result: ImageEditorSaveResult) => {
      if (editingMember) {
        setCustomCrewPortrait(editingMember.id, result.dataUrl);
        addToast(`${editingMember.name}'s disguise saved`);
      }
      setEditingMember(null);
    },
    [editingMember, setCustomCrewPortrait, addToast],
  );

  const handleDisguiseCancel = useCallback(() => {
    setEditingMember(null);
  }, []);

  const getPortrait = (m: CrewMember) => customCrewPortraits[m.id] ?? m.portrait;

  return (
    <div className="crew-screen" ref={containerRef}>
      <header className="screen-header">
        <button className="btn btn-ghost" onClick={goBack} type="button">
          {COPY.back}
        </button>
        <h2 className="screen-title">ASSEMBLE CREW</h2>
        <span className="crew-counter">
          {selected.size} / {CREW_PICK_COUNT}
        </span>
      </header>

      <div className="crew-layout">
        <div className="crew-grid">
          {CREW_MEMBERS.map((m) => {
            const isSelected = selected.has(m.id);
            const isDisabled = selected.size >= CREW_PICK_COUNT && !isSelected;
            return (
              <div key={m.id} className="crew-card-container">
                <button
                  className={`crew-card ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
                  onClick={() => toggleMember(m.id)}
                  type="button"
                  disabled={isDisabled}
                >
                  <div className="crew-portrait-wrap">
                    <img
                      src={getPortrait(m)}
                      alt={m.name}
                      className="crew-portrait-img"
                    />
                    <div
                      className="crew-portrait-rim"
                      style={{ boxShadow: `0 0 20px ${m.colors.rim}40, inset 0 0 20px ${m.colors.rim}20` }}
                    />
                    {customCrewPortraits[m.id] && (
                      <span className="crew-edited-badge">CUSTOM</span>
                    )}
                  </div>
                  <div className="crew-card-info">
                    <h3 className="crew-name">{m.name}</h3>
                    <span className="crew-role" style={{ color: m.colors.accent }}>
                      {m.role}
                    </span>
                    <p className="crew-bio">{m.bio}</p>
                    <span className="crew-modifier">{CREW_MODIFIERS[m.modifierId].description}</span>
                  </div>
                </button>
                {isSelected && (
                  <button
                    className="btn btn-ghost crew-disguise-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingMember(m);
                    }}
                    type="button"
                  >
                    Edit Disguise
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <aside className="crew-sidebar glass-panel">
          <h3>Active Modifiers</h3>
          {activeModifiers.length === 0 && (
            <p className="crew-sidebar-empty">Select crew members to see their modifiers</p>
          )}
          {activeModifiers.map((m) => (
            <div key={m.name} className="crew-modifier-card">
              <strong>{m.name}</strong>
              <span className="crew-modifier-role">{m.role}</span>
              <p>{m.desc}</p>
            </div>
          ))}
          <button
            className="btn btn-primary btn-large crew-continue"
            onClick={handleContinue}
            disabled={selected.size !== CREW_PICK_COUNT}
            type="button"
          >
            {COPY.continueNext}
          </button>
        </aside>
      </div>

      <div className="editor-powered-badge">
        Powered by React Image Editor
      </div>

      {editingMember && (
        <EditorModal
          title={`${editingMember.name} — Disguise & Tactical ID`}
          image={getPortrait(editingMember)}
          tools={DISGUISE_TOOLS}
          onSave={handleDisguiseSave}
          onCancel={handleDisguiseCancel}
        />
      )}
    </div>
  );
}
