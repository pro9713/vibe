type Props = {
  title: string;
  price: string;
  store: string;
};

export default function SearchProductCard({
  title,
  price,
  store,
}: Props) {
  return (
    <div className="bg-white rounded-2xl shadow-md p-5 hover:shadow-xl transition">

      <div className="h-52 rounded-xl bg-gray-200 flex items-center justify-center">
        Product Image
      </div>

      <h3 className="mt-5 text-xl font-bold">
        {title}
      </h3>

      <p className="mt-2 text-2xl font-bold text-blue-600">
        {price}
      </p>

      <p className="text-gray-500">
        {store}
      </p>

      <button className="mt-5 w-full rounded-xl bg-blue-600 py-3 text-white">
        Compare Prices
      </button>

    </div>
  );
}