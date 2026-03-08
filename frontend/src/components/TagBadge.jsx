const COLORS = [
  'bg-blue-100 text-blue-800',
  'bg-green-100 text-green-800',
  'bg-purple-100 text-purple-800',
  'bg-yellow-100 text-yellow-800',
  'bg-pink-100 text-pink-800',
  'bg-indigo-100 text-indigo-800',
  'bg-orange-100 text-orange-800',
  'bg-teal-100 text-teal-800',
];

function colorForTag(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

export default function TagBadge({ name, onRemove }) {
  return (
    <span className={`badge ${colorForTag(name)} gap-1`}>
      {name}
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-1 hover:opacity-70 focus:outline-none"
          aria-label={`Remove tag ${name}`}
        >
          ×
        </button>
      )}
    </span>
  );
}
