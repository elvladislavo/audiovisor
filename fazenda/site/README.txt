Готовый сайт «Фазенда». Эту папку целиком загружаем на Cloudflare Pages.

Cloudflare → Workers & Pages → Create → Pages → Upload assets → перетащить папку site.
(или подключить GitHub-репозиторий и указать Build output directory: fazenda/site, build command — пусто)

Новые фото: положить в fazenda/photo-originals/ с префиксом категории
(svadba-, lokaciya-, dekor-, eda-, torty-; main- — только для главной),
затем:  python3 fazenda/tools/optimize_photos.py
