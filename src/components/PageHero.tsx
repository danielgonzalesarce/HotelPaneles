interface PageHeroProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  image?: string;
  align?: 'left' | 'center';
}

export default function PageHero({
  eyebrow,
  title,
  subtitle,
  image,
  align = 'left',
}: PageHeroProps) {
  const alignClass = align === 'center' ? 'text-center mx-auto' : 'text-left';

  if (!image) {
    return (
      <section className="page-intro">
        <div className="page-container max-w-7xl">
          {eyebrow && <p className="section-eyebrow mb-2">{eyebrow}</p>}
          <h1 className={`page-intro-title ${alignClass}`}>{title}</h1>
          {subtitle && <p className={`page-intro-subtitle ${alignClass}`}>{subtitle}</p>}
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden bg-gray-900">
      <img src={image} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" referrerPolicy="no-referrer" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/40" />
      <div className={`relative page-container max-w-7xl py-14 md:py-20 ${alignClass}`}>
        {eyebrow && <p className="section-eyebrow text-gray-300 mb-2">{eyebrow}</p>}
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight max-w-3xl">{title}</h1>
        {subtitle && (
          <p className={`mt-4 text-base md:text-lg text-gray-300 leading-relaxed max-w-2xl ${align === 'center' ? 'mx-auto' : ''}`}>
            {subtitle}
          </p>
        )}
      </div>
    </section>
  );
}
