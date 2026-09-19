export default function LiquidGlassSurface({
  as: Tag = 'div',
  className = '',
  thickness = 'floating',
  children,
  interactive = false,
  ...props
}) {
  const ContentTag = Tag === 'span' ? 'span' : 'div';

  return (
    <Tag
      className={`lg-surface lg-surface--${thickness} ${className}`.trim()}
      data-lg-interactive={interactive ? 'true' : undefined}
      {...props}
    >
      <span className="lg-backdrop" aria-hidden="true" />
      <span className="lg-optics" aria-hidden="true">
        <span className="lg-caustic" />
        <span className="lg-specular" />
        <span className="lg-rim" />
      </span>
      <ContentTag className="lg-content">{children}</ContentTag>
    </Tag>
  );
}
