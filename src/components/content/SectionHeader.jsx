export default function SectionHeader({ title = 'Section', subtitle }) {
  return (
    <div className="pt-2 mb-4 border-t border-gray-100">
      <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
      {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
    </div>
  );
}
