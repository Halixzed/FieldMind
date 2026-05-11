interface Props {
  view: '2d' | '3d';
  editMode: boolean;
  layoutName: string;
  onViewChange: (v: '2d' | '3d') => void;
  onEditToggle: () => void;
}

export default function FarmToolbar({ view, editMode, layoutName, onViewChange, onEditToggle }: Props) {
  return (
    <div className="farm-toolbar">
      <div className="farm-toolbar-left">
        <h1 className="farm-title">{layoutName}</h1>
        <span className="farm-subtitle">Farm Map</span>
      </div>

      <div className="farm-toolbar-right">
        <button
          className={`farm-edit-btn${editMode ? ' active' : ''}`}
          onClick={onEditToggle}
        >
          {editMode ? '✓ Done editing' : '✏ Edit layout'}
        </button>

        <div className="farm-view-toggle">
          <button
            className={`fvt-btn${view === '2d' ? ' active' : ''}`}
            onClick={() => onViewChange('2d')}
          >
            Grid
          </button>
          <button
            className={`fvt-btn${view === '3d' ? ' active' : ''}`}
            onClick={() => onViewChange('3d')}
          >
            3D
          </button>
        </div>
      </div>
    </div>
  );
}
