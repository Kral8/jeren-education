/** Central Asia geography: countries → regions → cities → institutions */
export const COUNTRIES = [
  {
    id: 'tm',
    flag: '🇹🇲',
    dialCode: '+993',
    phoneLength: 8,
    name: { ru: 'Туркменистан', tm: 'Türkmenistan' },
    regions: [
      {
        id: 'ashgabat',
        name: { ru: 'Ашхабад', tm: 'Aşgabat' },
        cities: [
          {
            id: 'ashgabat-city',
            name: { ru: 'Ашхабад', tm: 'Aşgabat' },
            institutions: [
              'Туркменский государственный университет имени Махтумкули',
              'Туркменский национальный институт мировых языков имени Д. Азади',
              'Туркменский государственный медицинский университет',
              'Туркменский государственный архитектурно-строительный институт',
              'Туркменский государственный институт культуры',
              'Туркменский государственный институт экономики и управления',
              'Туркменский государственный педагогический институт',
              'Академия наук Туркменистана',
              'Школа № 1 г. Ашхабад',
              'Лицей № 15 г. Ашхабад',
            ],
          },
        ],
      },
      {
        id: 'ahal',
        name: { ru: 'Аhal welaýaty', tm: 'Ahal welaýaty' },
        cities: [
          {
            id: 'anau',
            name: { ru: 'Анау', tm: 'Anau' },
            institutions: [
              'Средняя школа № 12 г. Анау',
              'Педагогическое училище г. Анау',
              'Гимназия г. Анау',
            ],
          },
          {
            id: 'abadan',
            name: { ru: 'Абадан', tm: 'Abadan' },
            institutions: ['Средняя школа № 3 г. Абадан', 'Детский сад «Берекет»'],
          },
        ],
      },
      {
        id: 'balkan',
        name: { ru: 'Balkan welaýaty', tm: 'Balkan welaýaty' },
        cities: [
          {
            id: 'balkanabat',
            name: { ru: 'Балканабат', tm: 'Balkanabat' },
            institutions: [
              'Туркменский государственный университет имени Махтумкули (филиал)',
              'Педагогическое училище г. Балканабат',
              'Средняя школа № 5 г. Балканабат',
            ],
          },
          {
            id: 'turkmenbashi',
            name: { ru: 'Туркменбаши', tm: 'Türkmenbaşy' },
            institutions: [
              'Морской государственный университет имени К. Маркса',
              'Средняя школа № 7 г. Туркменбаши',
            ],
          },
          {
            id: 'serdar',
            name: { ru: 'Сердар', tm: 'Serdar' },
            institutions: ['Средняя школа № 2 г. Сердар'],
          },
        ],
      },
      {
        id: 'dashoguz',
        name: { ru: 'Daşoguz welaýaty', tm: 'Daşoguz welaýaty' },
        cities: [
          {
            id: 'dashoguz',
            name: { ru: 'Дашогуз', tm: 'Daşoguz' },
            institutions: [
              'Педагогический институт г. Дашогуз',
              'Средняя школа № 4 г. Дашогуз',
              'Гимназия г. Дашогуз',
            ],
          },
          {
            id: 'boldumsaz',
            name: { ru: 'Болдумсаз', tm: 'Boldumsaz' },
            institutions: ['Средняя школа № 1 г. Болдумсаз'],
          },
        ],
      },
      {
        id: 'lebap',
        name: { ru: 'Lebap welaýaty', tm: 'Lebap welaýaty' },
        cities: [
          {
            id: 'turkmenabat',
            name: { ru: 'Туркменабат', tm: 'Türkmenabat' },
            institutions: [
              'Педагогический институт г. Туркменабат',
              'Средняя школа № 6 г. Туркменабат',
              'Лицей г. Туркменабат',
            ],
          },
          {
            id: 'atamurat',
            name: { ru: 'Атамурат', tm: 'Atamyrat' },
            institutions: ['Средняя школа № 2 г. Атамурат'],
          },
          {
            id: 'sayat',
            name: { ru: 'Саят', tm: 'Saýat' },
            institutions: ['Средняя школа № 1 г. Саят'],
          },
        ],
      },
      {
        id: 'mary',
        name: { ru: 'Mary welaýaty', tm: 'Mary welaýaty' },
        cities: [
          {
            id: 'mary-city',
            name: { ru: 'Мары', tm: 'Mary' },
            institutions: [
              'Педагогический институт г. Мары',
              'Средняя школа № 8 г. Мары',
              'Гимназия г. Мары',
              'Колледж г. Мары',
            ],
          },
          {
            id: 'bayramali',
            name: { ru: 'Байрамали', tm: 'Baýramaly' },
            institutions: ['Средняя школа № 3 г. Байрамали'],
          },
        ],
      },
    ],
  },
  {
    id: 'kz',
    flag: '🇰🇿',
    dialCode: '+7',
    phoneLength: 10,
    name: { ru: 'Казахстан', tm: 'Gazagystan' },
    regions: [
      {
        id: 'astana',
        name: { ru: 'Астана', tm: 'Astana' },
        cities: [
          {
            id: 'astana-city',
            name: { ru: 'Астана', tm: 'Astana' },
            institutions: [
              'Евразийский национальный университет имени Л.Н. Гумилёва',
              'Казахский национальный университет искусств',
              'Астана IT University',
              'Школа-лицей № 1 г. Астана',
              'НИШ ФМН г. Астана',
            ],
          },
        ],
      },
      {
        id: 'almaty-city',
        name: { ru: 'Алматы', tm: 'Almaty' },
        cities: [
          {
            id: 'almaty',
            name: { ru: 'Алматы', tm: 'Almaty' },
            institutions: [
              'Казахский национальный университет имени аль-Фараби',
              'КазНУ им. аль-Фараби (педагогический факультет)',
              'Алматинский государственный университет',
              'KIMEP University',
              'Школа-гимназия № 90 г. Алматы',
              'НИШ ФМН г. Алматы',
            ],
          },
        ],
      },
      {
        id: 'shymkent',
        name: { ru: 'Шымкент', tm: 'Şymkent' },
        cities: [
          {
            id: 'shymkent-city',
            name: { ru: 'Шымкент', tm: 'Şymkent' },
            institutions: [
              'Южно-Казахстанский университет имени М. Ауэзова',
              'Шымкентский государственный педагогический институт',
              'Школа-лицей № 28 г. Шымкент',
            ],
          },
        ],
      },
      {
        id: 'karaganda',
        name: { ru: 'Карагандинская область', tm: 'Karagandy oblysy' },
        cities: [
          {
            id: 'karaganda',
            name: { ru: 'Караганда', tm: 'Karagandy' },
            institutions: [
              'Карагандинский государственный университет',
              'Карагандинский технический университет',
              'Школа-гимназия № 15 г. Караганда',
            ],
          },
          {
            id: 'temirtau',
            name: { ru: 'Темиртау', tm: 'Temirtau' },
            institutions: ['Средняя школа № 7 г. Темиртау'],
          },
        ],
      },
      {
        id: 'aktobe',
        name: { ru: 'Актюбинская область', tm: 'Aktöbe oblysy' },
        cities: [
          {
            id: 'aktobe-city',
            name: { ru: 'Актобе', tm: 'Aktöbe' },
            institutions: [
              'Западно-Казахстанский университет имени М. Утемисова',
              'Актюбинский региональный университет',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'uz',
    flag: '🇺🇿',
    dialCode: '+998',
    phoneLength: 9,
    name: { ru: 'Узбекистан', tm: 'Özbegistan' },
    regions: [
      {
        id: 'tashkent-city',
        name: { ru: 'Ташкент', tm: 'Taşkent' },
        cities: [
          {
            id: 'tashkent',
            name: { ru: 'Ташкент', tm: 'Taşkent' },
            institutions: [
              'Ташкентский государственный педагогический университет',
              'Национальный университет Узбекистана',
              'Ташкентский государственный университет востоковедения',
              'Академия государственного управления',
              'Школа № 45 г. Ташкент',
              'Академический лицей при НУУ',
            ],
          },
        ],
      },
      {
        id: 'samarkand',
        name: { ru: 'Самаркандская область', tm: 'Samarqand viloyati' },
        cities: [
          {
            id: 'samarkand-city',
            name: { ru: 'Самарканд', tm: 'Samarqand' },
            institutions: [
              'Самаркандский государственный университет',
              'Самаркандский государственный институт иностранных языков',
              'Школа № 12 г. Самарканд',
            ],
          },
          {
            id: 'kattakurgan',
            name: { ru: 'Каттакурган', tm: 'Kattaqo\'rg\'on' },
            institutions: ['Педагогическое училище г. Каттакурган'],
          },
        ],
      },
      {
        id: 'bukhara',
        name: { ru: 'Бухарская область', tm: 'Buxoro viloyati' },
        cities: [
          {
            id: 'bukhara-city',
            name: { ru: 'Бухара', tm: 'Buxoro' },
            institutions: [
              'Бухарский государственный университет',
              'Бухарский педагогический институт',
            ],
          },
        ],
      },
      {
        id: 'fergana',
        name: { ru: 'Ферганская область', tm: 'Farg\'ona viloyati' },
        cities: [
          {
            id: 'fergana-city',
            name: { ru: 'Фергана', tm: 'Farg\'ona' },
            institutions: [
              'Ферганский государственный университет',
              'Ферганский политехнический институт',
            ],
          },
          {
            id: 'kokand',
            name: { ru: 'Коканд', tm: 'Qo\'qon' },
            institutions: ['Кокандский педагогический институт'],
          },
        ],
      },
      {
        id: 'andijan',
        name: { ru: 'Андижанская область', tm: 'Andijon viloyati' },
        cities: [
          {
            id: 'andijan-city',
            name: { ru: 'Андижан', tm: 'Andijon' },
            institutions: [
              'Андижанский государственный университет',
              'Андижанский педагогический институт',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'tj',
    flag: '🇹🇯',
    dialCode: '+992',
    phoneLength: 9,
    name: { ru: 'Таджикистан', tm: 'Täjikistan' },
    regions: [
      {
        id: 'dushanbe',
        name: { ru: 'Душанбе', tm: 'Duşanbe' },
        cities: [
          {
            id: 'dushanbe-city',
            name: { ru: 'Душанбе', tm: 'Duşanbe' },
            institutions: [
              'Таджикский национальный университет',
              'Таджикский государственный педагогический университет',
              'Таджикский государственный медицинский университет',
              'Школа № 1 г. Душанбе',
              'Лицей при ТНУ',
            ],
          },
        ],
      },
      {
        id: 'sughd',
        name: { ru: 'Согдийская область', tm: 'Sughd viloyati' },
        cities: [
          {
            id: 'khujand',
            name: { ru: 'Худжанд', tm: 'Hujand' },
            institutions: [
              'Худжандский государственный университет',
              'Худжандский педагогический институт',
            ],
          },
          {
            id: 'istaravshan',
            name: { ru: 'Истаравшан', tm: 'Istaravşan' },
            institutions: ['Средняя школа № 5 г. Истаравшан'],
          },
        ],
      },
      {
        id: 'khatlon',
        name: { ru: 'Хатлонская область', tm: 'Hatlon viloyati' },
        cities: [
          {
            id: 'bokhtar',
            name: { ru: 'Бохтар', tm: 'Bohtar' },
            institutions: [
              'Кулябский государственный университет (филиал)',
              'Педагогический колледж г. Бохтар',
            ],
          },
          {
            id: 'kulob',
            name: { ru: 'Куляб', tm: 'Kulob' },
            institutions: ['Кулябский государственный университет'],
          },
        ],
      },
      {
        id: 'gorno-badakhshan',
        name: { ru: 'ГБАО', tm: 'GBAO' },
        cities: [
          {
            id: 'khorog',
            name: { ru: 'Хорог', tm: 'Horog' },
            institutions: ['Горно-Бадахшанский университет', 'Школа № 3 г. Хорог'],
          },
        ],
      },
    ],
  },
];
