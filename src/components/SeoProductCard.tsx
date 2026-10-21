import { formatPriceDkk, stockLabel } from "@/lib/format";
import type { SeoProductRow } from "@/lib/pseo/landings";

type Props = {
  product: SeoProductRow;
};

export function SeoProductCard({ product }: Props) {
  return (
    <article className="product-card">
      <div className="product-card__media">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- partner CDNs vary by feed
          <img
            src={product.imageUrl}
            alt=""
            className="product-card__img"
            loading="lazy"
          />
        ) : (
          <div className="product-card__placeholder" aria-hidden>
            GaveGenie
          </div>
        )}
        {product.isSample && (
          <span className="product-card__badge">Eksempel · DEV</span>
        )}
      </div>
      <div className="product-card__body">
        <p className="product-card__retailer">{product.retailerName}</p>
        <h3 className="product-card__title">{product.title}</h3>
        <p className="product-card__price">
          {formatPriceDkk(product.priceOre, product.currency)}
        </p>
        <p className="product-card__stock">{stockLabel(product.inStock)}</p>
        <a
          className="product-card__cta"
          href={product.productUrl}
          target="_blank"
          rel="noopener noreferrer sponsored"
        >
          Se hos forhandler
        </a>
      </div>
    </article>
  );
}
