export default function TextBlock(props) {
  const content = props.content ?? "";
  return (
    <div style={{ marginBottom: "16px" }}>{content && <p>{content}</p>}</div>
  );
}
