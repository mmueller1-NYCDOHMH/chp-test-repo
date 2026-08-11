export default function StatGrid(props) {
  const data = props.data ?? []
  const validData = Array.isArray(data) ? data : []
  return (
    <div className="grid grid-cols-2 gap-4">
      {validData.map((item, i) => (
        <div
          key={i}
          className="p-4 bg-white border rounded-lg shadow-sm"
        >
          <div className="text-sm text-gray-500">
            {item.label}
          </div>
          <div className="text-xl font-semibold">
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}