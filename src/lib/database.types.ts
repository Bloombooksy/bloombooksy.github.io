// Wygenerowane z bazy (supabase gen types) i lekko przycięte.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Salon = {
  created_at: string;
  id: string;
  krok_min: number;
  nazwa: string;
  owner_id: string;
  sms_godzina: number;
  sms_nadawca: string;
  sms_szablon: string;
  sms_wlaczone: boolean;
  strefa: string;
  zapisy_horyzont_dni: number;
  zapisy_token: string;
  zapisy_wlaczone: boolean;
  zapisy_wyprzedzenie_h: number;
  adres: string;
  telefon: string;
  branza: Branza;
  kolor: string;
  slug: string | null;
};

export type Branza = "paznokcie" | "rzesy_brwi" | "fryzjer" | "barber" | "kosmetyka" | "masaz" | "inne";
export type Rola = "wlascicielka" | "pracownik";

type Pracownik = {
  id: string;
  salon_id: string;
  imie: string;
  kolor: string;
  aktywny: boolean;
  w_zapisach: boolean;
  kolejnosc: number;
  user_id: string | null;
  email: string | null;
  rola: Rola;
  created_at: string;
};
type UslugaPracownik = { usluga_id: string; pracownik_id: string };
type GodzinyPracownika = { pracownik_id: string; dzien: number; od_godz: string; do_godz: string };

type Rel = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne: boolean;
  referencedRelation: string;
  referencedColumns: string[];
}[];

export type StatusWizyty = "oczekuje" | "potwierdzona" | "zrealizowana" | "odwolana" | "nieobecnosc";
export type ZrodloWizyty = "panel" | "link";
export type SmsStatus = "brak" | "wyslany" | "blad" | "pominiety" | "test";
export type Platnosc = "gotowka" | "karta" | "blik" | "przelew";

type Wizyta = {
  cena: number;
  created_at: string;
  id: string;
  klientka_id: string | null;
  koniec: string;
  kwota: number | null;
  napiwek: number;
  notatka: string;
  platnosc: Platnosc | null;
  salon_id: string;
  sms_blad: string | null;
  sms_status: SmsStatus;
  sms_wyslano: string | null;
  start: string;
  status: StatusWizyty;
  usluga_id: string | null;
  usluga_nazwa: string;
  zrodlo: ZrodloWizyty;
  kod: string;
  odwolala_klientka: boolean;
  pracownik_id: string;
};

type Klientka = {
  created_at: string;
  id: string;
  imie: string;
  instagram: string;
  notatka: string;
  salon_id: string;
  telefon: string;
  zgoda_sms: boolean;
};

type Usluga = {
  aktywna: boolean;
  cena: number;
  created_at: string;
  czas_min: number;
  id: string;
  kolejnosc: number;
  kolor: string;
  nazwa: string;
  salon_id: string;
  w_zapisach: boolean;
};

type GodzinyPracy = { do_godz: string; dzien: number; od_godz: string; salon_id: string };
type Przerwa = { id: string; koniec: string; opis: string; salon_id: string; start: string; pracownik_id: string | null };

type T<Row, Req extends keyof Row> = {
  Row: Row;
  Insert: Partial<Row> & Pick<Row, Req>;
  Update: Partial<Row>;
  Relationships: Rel;
};

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.18" };
  public: {
    Tables: {
      salony: T<Salon, never>;
      uslugi: T<Usluga, "nazwa" | "czas_min" | "salon_id">;
      klientki: T<Klientka, "imie" | "salon_id">;
      godziny_pracy: T<GodzinyPracy, "dzien" | "od_godz" | "do_godz" | "salon_id">;
      przerwy: T<Przerwa, "start" | "koniec" | "salon_id">;
      wizyty: T<Wizyta, "start" | "koniec" | "salon_id">;
      pracownicy: T<Pracownik, "imie" | "salon_id">;
      uslugi_pracownicy: T<UslugaPracownik, "usluga_id" | "pracownik_id">;
      godziny_pracownikow: T<GodzinyPracownika, "pracownik_id" | "dzien" | "od_godz" | "do_godz">;
    };
    Views: { [_ in never]: never };
    Functions: {
      moj_salon: { Args: never; Returns: Salon };
      nowy_link_zapisow: { Args: never; Returns: string };
      zapisy_info: { Args: { p_token: string }; Returns: Json };
      zapisy_wolne: { Args: { p_token: string; p_usluga: string; p_dzien: string }; Returns: string[] };
      zapisy_rezerwuj: {
        Args: { p_token: string; p_usluga: string; p_start: string; p_imie: string; p_telefon: string; p_notatka?: string };
        Returns: Json;
      };
      wizyta_info: { Args: { p_kod: string }; Returns: Json };
      moj_kontekst: { Args: never; Returns: Json };
      zaloz_salon: { Args: { p_nazwa: string; p_branza: string; p_kolor: string; p_imie: string }; Returns: Json };
      zapisy_wolne_v2: {
        Args: { p_token: string; p_usluga: string; p_dzien: string; p_pracownik?: string | null };
        Returns: { start: string; pracownik_id: string }[];
      };
      zapisy_rezerwuj_v2: {
        Args: { p_token: string; p_usluga: string; p_start: string; p_imie: string; p_telefon: string; p_notatka?: string; p_pracownik?: string | null };
        Returns: Json;
      };
      wizyta_odwolaj: { Args: { p_kod: string }; Returns: Json };
    };
    Enums: {
      platnosc: Platnosc;
      sms_status: SmsStatus;
      status_wizyty: StatusWizyty;
      zrodlo_wizyty: ZrodloWizyty;
    };
    CompositeTypes: { [_ in never]: never };
  };
};

export type SalonRow = Salon;
export type WizytaRow = Wizyta;
export type KlientkaRow = Klientka;
export type UslugaRow = Usluga;
export type GodzinyRow = GodzinyPracy;
export type PrzerwaRow = Przerwa;
export type PracownikRow = Pracownik;
export type UslugaPracownikRow = UslugaPracownik;
export type GodzinyPracownikaRow = GodzinyPracownika;
