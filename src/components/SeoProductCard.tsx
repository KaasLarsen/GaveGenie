import { formatPriceDkk, stockLabel } from "@/lib/format";
import type { SeoProductRow } from "@/lib/pseo/landings";

type Props = {
  product: SeoProductRow;
};

function shortDescription(description: string | null): string | null {
  if (!description) return null;
  const cleaned = description.replace(/\s+/g, " ").trim();
  if (cleaned.length < 24) return null;
  if (cleaned.length <= 140) return cleaned;
  return `${cleaned.slice(0, 137).trimEnd()}…`;
}

export function SeoProductCard({ product }: Props) {
  const blurb = shortDescription(product.description);

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
        {product.why ? (
          <p className="product-card__why">{product.why}</p>
        ) : blurb ? (
          <p className="product-card__why">{blurb}</p>
        ) : null}
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
