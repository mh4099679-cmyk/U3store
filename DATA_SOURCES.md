# Egypt Administrative Divisions Data Source & Attribution

## Data Source
- **Project Name**: Egypt Administrative Divisions (`egypt-administrative-divisions`)
- **Publisher**: Open Admin Data / Capmas Mapping Project
- **Repository**: [https://github.com/open-admin-data/egypt-administrative-divisions](https://github.com/open-admin-data/egypt-administrative-divisions)
- **Website**: [https://openadmindata.org/eg/](https://openadmindata.org/eg/)

## License & Attribution (CC-BY-4.0)
This dataset is licensed under the **Creative Commons Attribution 4.0 International License (CC-BY-4.0)**.
- **License Details**: [https://creativecommons.org/licenses/by/4.0/](https://creativecommons.org/licenses/by/4.0/)
- **Attribution Statement**:
  > Administrative division data for the Arab Republic of Egypt is sourced from Open Admin Data (https://openadmindata.org/eg/), licensed under CC-BY-4.0. Open Admin Data project repository: https://github.com/open-admin-data/egypt-administrative-divisions.

## Embedded Dataset Structure
The dataset provides complete, offline-capable hierarchical data embedded inside the project:
1. **Level 1 — 27 Governorates (المحافظات)**:
   - Cairo, Giza, Alexandria, Qalyubia, Sharqia, Dakahlia, Gharbia, Monufia, Beheira, Kafr El Sheikh, Damietta, Port Said, Ismailia, Suez, North Sinai, South Sinai, Beni Suef, Fayoum, Minya, Asyut, Sohag, Qena, Luxor, Aswan, Red Sea, New Valley, Matrouh.
2. **Level 2 — 365 Administrative Divisions (المدن والمراكز والأقسام)**:
   - Marakiz (مراكز), Aqsam (أقسام), and Modon (مدن) linked directly to their parent governorate ID (`governorate_id`).
3. **Level 3 — 5,716 Local Sub-Divisions (المناطق والشياخات والقرى)**:
   - Shiyakhat (شياخات), Villages (قرى), and Urban Districts linked directly to their parent Level-2 division ID (`city_id`).

## Integration in U3 STORE
- Embedded locally in SQLite database tables: `governorates`, `cities`, `areas`.
- Offline execution: No live runtime third-party HTTP calls are made during the checkout experience.
- Cascading searchable dropdowns in `/checkout` with real-time bilingual Arabic/English search.
- Full address hierarchy stored per order: governorate, city/center, area/shiyakha, street address, building #, floor #, apt #, landmark, delivery notes.

