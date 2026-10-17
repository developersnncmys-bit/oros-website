/**
 * The shared banner / showreel title treatment: two admin-authored parts,
 * `title1` then `title2`, each rendered in its own admin-picked colour.
 */
export default function TwoToneHeading({
  title1,
  title2,
  title1Color,
  title2Color,
  as: As = "h2",
  className = "",
  ...props
}) {
  if (!title1 && !title2) return null;
  return (
    <As className={className} {...props}>
      {title1 && (
        <span style={title1Color ? { color: title1Color } : undefined}>
          {title1}
        </span>
      )}
      {title1 && title2 ? " " : null}
      {title2 && (
        <span style={title2Color ? { color: title2Color } : undefined}>
          {title2}
        </span>
      )}
    </As>
  );
}
