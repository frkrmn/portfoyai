export type ContentFieldType = "text" | "textarea" | "array-of-objects";

export type ContentFieldDescriptor = {
  key: string;
  label: string;
  type: ContentFieldType;
  itemFields?: ContentFieldDescriptor[];
};

const labels: Record<string, string> = {
  aboutDescription: "Hakkımızda açıklaması", aboutTitle: "Hakkımızda başlığı", activePortfolioLabel: "Aktif portföy etiketi",
  agentName: "Danışman adı", allLabel: "Tümü etiketi", areaLabel: "Alan etiketi", averageYieldLabel: "Ortalama kira getirisi etiketi",
  backLabel: "Geri bağlantısı", bathLabel: "Banyo etiketi", bedLabel: "Oda etiketi", budgetMaxLabel: "En yüksek bütçe etiketi",
  budgetMinLabel: "En düşük bütçe etiketi", cardViewLabel: "Kart görünümü etiketi", categoriesEyebrow: "Kategori üst başlığı",
  categoriesTitle: "Kategori başlığı", comparisonViewLabel: "Karşılaştırma görünümü etiketi", contactActionLabel: "İletişim butonu",
  ctaText: "Ana aksiyon metni", daysOnlineLabel: "Yayında kalma süresi etiketi", dealsSectionDescription: "Fırsatlar açıklaması",
  dealsSectionTitle: "Fırsatlar başlığı", detailsLabel: "Detay bağlantısı", directContactLabel: "Doğrudan iletişim butonu",
  emailLabel: "E-posta alanı etiketi", emptyListings: "Boş portföy mesajı", eyebrow: "Ana üst başlık", featuredEyebrow: "Öne çıkanlar üst başlığı",
  featuredStripTitle: "Öne çıkan ilanlar başlığı", featuredTitle: "Öne çıkanlar başlığı", feelingLabel: "His alanı etiketi",
  findHomeDescription: "Arama alanı açıklaması", findHomeTitle: "Arama alanı başlığı", formError: "Form hata mesajı",
  formSubmit: "Form gönder butonu", formSubmitting: "Form gönderiliyor metni", formSuccess: "Form başarı mesajı",
  fullNameLabel: "Ad soyad alanı etiketi", guideQuote: "Danışman sözü", guideTitle: "Rehber başlığı", headlineAccent: "Vurgulu başlık satırı",
  investmentWhyTitle: "Yatırım yaklaşımı başlığı", keywordLabel: "Anahtar kelime alanı etiketi", landLabel: "Arsa etiketi",
  listingAboutLabel: "İlan açıklaması başlığı", listingFeaturesLabel: "İlan özellikleri başlığı", listingsDescription: "Portföy sayfası açıklaması",
  listingsTitle: "Portföy sayfası başlığı", locationLabel: "Konum alanı etiketi", matchDescription: "Eşleştirme açıklaması",
  matchEyebrow: "Eşleştirme üst başlığı", matchResultsDescription: "Eşleştirme sonuç açıklaması", matchResultsTitle: "Eşleştirme sonuç başlığı",
  matchSubmitLabel: "Eşleştirme butonu", matchTitle: "Eşleştirme formu başlığı", messageLabel: "Mesaj alanı etiketi",
  navAbout: "Hakkımızda menü metni", navContact: "İletişim menü metni", navListings: "Portföyler menü metni",
  neighborhoodListingLabel: "Mahalle ilan sayısı etiketi", neighborhoodsDescription: "Mahalleler açıklaması", neighborhoodsTitle: "Mahalleler başlığı",
  opportunityLabel: "Fırsat etiketi", originalPriceLabel: "Eski fiyat etiketi", phoneLabel: "Telefon alanı etiketi",
  priceDroppedLabel: "Fiyat düştü etiketi", pricePerM2Label: "Metrekare fiyatı etiketi", priceRangeLabel: "Fiyat etiketi", processTitle: "Nasıl çalışıyoruz başlığı",
  propertyTypeLabel: "Emlak türü alanı etiketi", regionalGrowthLabel: "Bölgesel değer artışı etiketi", rentLabel: "Kiralık etiketi",
  rentSectionTitle: "Kiralık ilanlar başlığı", rentalYieldLabel: "Kira getirisi etiketi", roiLabel: "Yatırım görünümü başlığı",
  roomLabel: "Oda alanı etiketi", saleLabel: "Satılık etiketi", saleSectionTitle: "Satılık ilanlar başlığı",
  searchLabel: "Arama alanı etiketi", servicesDescription: "Hizmetler açıklaması", servicesTitle: "Hizmetler başlığı",
  showcaseEyebrow: "Galeri üst başlığı", showcaseTitle: "Galeri başlığı", tagline: "Kısa slogan", teamDescription: "Ekip bölümü açıklaması",
  testimonialAuthor: "Referans adı", testimonialQuote: "Referans sözü", testimonialRole: "Referans görevi", timingLabel: "Zamanlama alanı etiketi",
  tourDescription: "İletişim formu açıklaması", tourTitle: "İletişim formu başlığı", typeLabel: "İlan türü alanı etiketi",
  usageLabel: "Kullanım türü etiketi", urgentSaleLabel: "Acil satılık etiketi", whyEyebrow: "Neden biz üst başlığı", whyTitle: "Neden biz başlığı",
};

export const contentFieldLabel = (key: string) => labels[key] || key.replace(/([a-z])([A-Z])/g, "$1 $2");

export const contentFields = (keys: string[], textareaKeys: string[] = []): ContentFieldDescriptor[] => keys.map((key) => ({
  key: `content.${key}`,
  label: contentFieldLabel(key),
  type: textareaKeys.includes(key) ? "textarea" : "text",
}));

export const objectArrayField = (key: string, label: string, itemFields: Array<[string, string, ("text" | "textarea")?]>): ContentFieldDescriptor => ({
  key: `content.${key}`,
  label,
  type: "array-of-objects",
  itemFields: itemFields.map(([itemKey, itemLabel, itemType = "text"]) => ({ key: itemKey, label: itemLabel, type: itemType })),
});

// An empty item key represents a primitive string in a repeatable list.
export const stringArrayField = (key: string, label: string, itemLabel: string): ContentFieldDescriptor => objectArrayField(key, label, [["", itemLabel, "text"]]);
