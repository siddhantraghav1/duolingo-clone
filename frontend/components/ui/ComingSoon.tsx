import Mascot from "./Mascot";

/** Placeholder for features the assignment allows us to mock. */
export default function ComingSoon({ title, text = "We're still building this. Check back soon!" }: {
  title: string;
  text?: string;
}) {
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <Mascot mood="thinking" size={140} />
      <h1 className="mt-6 text-2xl font-extrabold">{title}</h1>
      <p className="mt-2 max-w-sm text-muted">{text}</p>
    </div>
  );
}
