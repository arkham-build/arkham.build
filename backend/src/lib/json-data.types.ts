export type Coded = {
  code: string;
};

export type Translatable<T> = {
  code: string;
} & Partial<T>;

export type WrappedTranslation<T> = {
  locale: string;
  translation: Translatable<T>[];
};

export type TranslationTable<T> = Record<
  string,
  Record<string, Translatable<T>>
>;

export type ItemTranslation<T> = Partial<T> & { locale: string };

export type WithItemTranslations<T> = T & {
  translations: ItemTranslation<T>[];
};
