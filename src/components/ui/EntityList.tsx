type EntityListProps = {
  title: string;
  description: string;
  fields: string[];
  collection: string;
};

export function EntityList({ title, description, fields, collection }: EntityListProps) {
  return (
    <section className="card">
      <h2>{title}</h2>
      <p>{description}</p>
      <p><strong>Coleção:</strong> {collection}</p>
      <h3>Campos principais</h3>
      <ul>{fields.map((field) => <li key={field}><code>{field}</code></li>)}</ul>
      <button className="btn">Novo registro</button>
    </section>
  );
}
