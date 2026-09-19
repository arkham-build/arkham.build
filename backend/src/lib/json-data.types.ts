export type Coded = {
  code: string;
};

export type Translatable<SourceItem> = {
  code: string;
} & Partial<SourceItem>;

export type WrappedTranslation<
  SourceItem,
  TranslationItem extends Coded = Translatable<SourceItem>,
> = {
  locale: string;
  translation: TranslationItem[];
};

export type TranslationTable<
  SourceItem,
  TranslationItem extends Coded = Translatable<SourceItem>,
> = Record<string, Record<string, TranslationItem>>;

export type ItemTranslation<TranslationItem> = Partial<
  Omit<TranslationItem, "code">
> & {
  locale: string;
};

export type WithItemTranslations<
  SourceItem,
  TranslationItem = SourceItem,
> = SourceItem & {
  translations: ItemTranslation<TranslationItem>[];
};
