-- Add page content settings for CMS functionality
INSERT INTO site_settings (key, description, value) VALUES 
('home_hero', 'Sekcja główna strony głównej', '{
  "title": "Salon Hanami-Spa",
  "subtitle": "Odkryj japońską filozofię relaksu w sercu Ostrowa Wielkopolskiego",
  "button_primary": "Zarezerwuj wizytę",
  "button_secondary": "Poznaj nasze usługi"
}'),
('home_services', 'Sekcja usług na stronie głównej', '{
  "title": "Nasze usługi",
  "description": "Profesjonalne masaże i zabiegi spa inspirowane japońską tradycją i nowoczesnymi technikami"
}'),
('home_about', 'Sekcja o nas na stronie głównej', '{
  "title": "Filozofia Hanami",
  "content": "Hanami to japońska tradycja podziwiania kwitnących wiśni, symbolizująca przemijającą piękność życia. W naszym spa łączymy tę filozofię z nowoczesną terapią, tworząc przestrzeń harmonii i odnowy.",
  "content_secondary": "Nasze doświadczone terapeutki oferują personalizowane zabiegi, które nie tylko relaksują ciało, ale także uspokajają umysł, przywracając naturalną równowagę.",
  "button_text": "Poznaj naszą historię"
}'),
('home_features', 'Sekcja dlaczego nas wybierają', '{
  "title": "Dlaczego wybierają nas klienci",
  "features": [
    {"title": "Doświadczone terapeutki", "description": "Nasze masażystki posiadają wieloletnie doświadczenie i certyfikaty"},
    {"title": "Wysokiej jakości produkty", "description": "Używamy tylko najlepszych, naturalnych olejków i kosmetyków"},
    {"title": "Indywidualne podejście", "description": "Każdy zabieg dostosowujemy do potrzeb i preferencji klienta"}
  ]
}'),
('home_cta', 'Sekcja call-to-action na stronie głównej', '{
  "title": "Gotowy na chwilę relaksu?",
  "description": "Zarezerwuj swoją wizytę już dziś i doświadcz magii japońskiego spa",
  "button_primary": "Zarezerwuj wizytę",
  "button_secondary": "Odwiedź sklep"
}'),
('about_hero', 'Sekcja główna strony o nas', '{
  "title": "O nas",
  "description": "Poznaj historię i filozofię Dayspa Hanami - miejsca, gdzie tradycja spotyka się z nowoczesnością"
}'),
('about_story', 'Historia firmy', '{
  "title": "Nasza historia",
  "content": [
    "Dayspa Hanami powstało z pasji do japońskiej kultury wellness i głębokiego przekonania, że każdy zasługuje na chwile relaksu i regeneracji w swoim życiu.",
    "Nazwa \"Hanami\" pochodzi od japońskiej tradycji podziwiania kwitnących wiśni - symbolu przemijającego piękna i chwil, które warto celebrować. Podobnie jak ta tradycja, nasze spa zachęca do zatrzymania się, zwolnienia i cieszenia się obecną chwilą.",
    "Oferujemy profesjonalne usługi masażu i spa w sercu Ostrowa Wielkopolskiego, łącząc najlepsze tradycje Wschodu z nowoczesnymi technikami terapeutycznymi."
  ],
  "button_text": "Poznaj nasze usługi"
}'),
('about_values', 'Wartości firmy', '{
  "title": "Nasze wartości",
  "description": "To, co kieruje nami w codziennej pracy i sprawia, że jesteśmy wyjątkowi w branży wellness",
  "values": [
    {"title": "Pasja", "description": "Każdy zabieg wykonujemy z pełnym zaangażowaniem i miłością do tego, co robimy."},
    {"title": "Jakość", "description": "Używamy tylko najlepszych produktów i najnowszych technik masażu."},
    {"title": "Troska", "description": "Dbamy o komfort i zadowolenie każdego naszego klienta."},
    {"title": "Doświadczenie", "description": "Nasze terapeutki posiadają wieloletnie doświadczenie i certyfikaty."}
  ]
}'),
('about_team', 'Sekcja zespołu', '{
  "title": "Nasz zespół",
  "description": "Poznaj doświadczone terapeutki, które zadbają o Twój komfort i relaks podczas każdej wizyty"
}'),
('about_philosophy', 'Filozofia firmy', '{
  "title": "Filozofia Hanami",
  "description": "\"Hanami\" to japońska tradycja kontemplacji przemijającego piękna kwitnących wiśni. W naszym spa tworzymy przestrzeń, gdzie możesz zatrzymać się, odetchnąć i docenić piękno obecnej chwili.",
  "quote": "Prawdziwe piękno tkwi w umiejętności zatrzymania się i docenienia chwili, którą mamy teraz.",
  "button_text": "Zarezerwuj swoją chwilę relaksu"
}'),
('services_hero', 'Sekcja główna strony usług', '{
  "title": "Nasze usługi",
  "description": "Odkryj pełną gamę profesjonalnych zabiegów spa i masaży inspirowanych japońską tradycją wellness"
}'),
('services_approach', 'Podejście do usług', '{
  "title": "Nasze podejście",
  "content": [
    "Każdy zabieg w Dayspa Hanami to starannie zaplanowane doświadczenie, które łączy nowoczesne techniki z japońską filozofią wellness.",
    "Nasze doświadczone terapeutki dostosowują każdy zabieg do indywidualnych potrzeb klienta, zapewniając maksymalny komfort i efektywność."
  ],
  "features": [
    {"title": "Certyfikowane terapeutki", "description": "Wszystkie nasze specjalistki posiadają odpowiednie kwalifikacje"},
    {"title": "Premium produkty", "description": "Używamy tylko najwyższej jakości kosmetyków i olejków"},
    {"title": "Indywidualne podejście", "description": "Każdy zabieg dostosowujemy do Twoich potrzeb"}
  ]
}'),
('services_cta', 'Call-to-action strony usług', '{
  "title": "Gotowy na relaks?",
  "description": "Zarezerwuj swoją wizytę już dziś i odkryj magię japońskiego spa",
  "button_text": "Zarezerwuj wizytę"
}'),
('contact_hero', 'Sekcja główna strony kontakt', '{
  "title": "Kontakt",
  "description": "Skontaktuj się z nami - jesteśmy tutaj, aby odpowiedzieć na wszystkie Twoje pytania dotyczące naszych usług"
}'),
('contact_info', 'Informacje kontaktowe', '{
  "title": "Informacje kontaktowe",
  "address": {
    "title": "Adres",
    "details": ["Ostrów Wielkopolski", "ul. Przykładowa 123", "63-400 Ostrów Wielkopolski"]
  },
  "phone": {
    "title": "Telefon",
    "details": ["+48 123 456 789", "+48 987 654 321"]
  },
  "email": {
    "title": "Email",
    "details": ["info@dayspahanami.pl", "rezerwacje@dayspahanami.pl"]
  },
  "hours": {
    "title": "Godziny otwarcia",
    "details": [
      "Poniedziałek - Piątek: 9:00 - 20:00",
      "Sobota: 10:00 - 18:00",
      "Niedziela: 11:00 - 17:00"
    ]
  }
}'),
('contact_form', 'Formularz kontaktowy', '{
  "title": "Napisz do nas"
}'),
('contact_faq', 'FAQ sekcja', '{
  "title": "Często zadawane pytania",
  "description": "Znajdź odpowiedzi na najczęściej zadawane pytania",
  "items": [
    {"question": "Jak mogę zarezerwować wizytę?", "answer": "Możesz zarezerwować wizytę online przez naszą stronę internetową, telefonicznie lub osobiście w salonie."},
    {"question": "Czy mogę anulować rezerwację?", "answer": "Tak, rezerwację można anulować do 24 godzin przed umówionym terminem bez ponoszenia dodatkowych kosztów."},
    {"question": "Jakie formy płatności przyjmujecie?", "answer": "Przyjmujemy płatności gotówką, kartą płatniczą oraz BLIK."},
    {"question": "Czy oferujecie pakiety zabiegów?", "answer": "Tak, oferujemy różne pakiety zabiegów ze specjalnymi cenami. Szczegóły dostępne w zakładce Usługi."},
    {"question": "Czy mogę kupić voucher na zabieg?", "answer": "Tak, oferujemy vouchery podarunkowe na wszystkie nasze usługi. To idealny prezent dla bliskich."}
  ]
}'),
('contact_map', 'Sekcja mapy', '{
  "title": "Jak nas znaleźć",
  "description": "Znajdziesz nas w centrum Ostrowa Wielkopolskiego",
  "map_title": "Mapa Google",
  "map_description": "Dokładną lokalizację znajdziesz na mapie Google",
  "button_text": "Otwórz w Google Maps"
}'),
('social_media', 'Media społecznościowe', '{
  "title": "Śledź nas w mediach społecznościowych",
  "facebook": "https://www.facebook.com/dayspahanami",
  "instagram": "#"
}');