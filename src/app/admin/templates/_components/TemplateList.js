'use client';

export default function TemplateList({ templates }) {
  if (!templates?.length) {
    return (
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 text-sm text-neutral-300 text-center">
        No templates yet. Create one to speed up future trips.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {templates.map((template) => (
        <article
          key={template.id}
          className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold">{template.name}</h3>
              <p className="text-sm text-neutral-400">
                {template.destinationCountry} ·{' '}
                {template.tripLengthDays
                  ? `${template.tripLengthDays} day${template.tripLengthDays === 1 ? '' : 's'}`
                  : 'Length not set'}
              </p>
            </div>
            <a
              href={`/admin/templates/${template.id}`}
              className="text-sm font-medium text-orange-300 hover:text-orange-200"
            >
              Open builder →
            </a>
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <Fact label="Cards" value={template.itinerary?.cards?.length ?? 0} />
            <Fact label="Source trip" value={template.sourceTripId || '—'} />
            <Fact
              label="Updated"
              value={
                template.updatedAt
                  ? new Date(template.updatedAt).toLocaleString('en-GB', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })
                  : 'unknown'
              }
            />
          </dl>
          {template.notes ? (
            <p className="text-sm text-neutral-300">{template.notes}</p>
          ) : null}
        </article>
      ))}
    </div>
  );
}

function Fact({ label, value }) {
  return (
    <div className="bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3">
      <dt className="text-[11px] uppercase tracking-wide text-neutral-400">{label}</dt>
      <dd className="text-sm font-medium text-neutral-100 mt-1">
        {value ?? '—'}
      </dd>
    </div>
  );
}
