# Tezgah

Tezgah, Windows için yerel bir ajan ve kod çalışma alanıdır. Codex, Claude Code ve Google Antigravity aynı çalışma alanında kullanılabilir. Her ajan kendi modelini, düşünme seviyesini, modunu ve proje klasörünü kullanır.

## Başlat

1. Node.js 22 veya üstü kurulu olmalı.
2. `Tezgah.cmd` dosyasını çift tıkla veya bu klasörde `npm start` çalıştır. Tezgah, Microsoft Edge veya Chrome’da ayrı bir uygulama penceresi açar.
3. **Bağlantılar** menüsünden sağlayıcıların durumunu kontrol et. Gerekiyorsa ilgili CLI’yı kur ve terminalden Codex için `codex login`, Claude Code için `claude auth login`, Antigravity için `agy` ile oturum aç.

`npm run serve`, Tezgah’ı yerel olarak başlatır ve terminalde açılış bağlantısını gösterir. Giriş bilgilerini sağlayıcıların kendi araçları yönetir. Tezgah, sohbet görünümünü, proje listesini ve örnek projeyi `%LOCALAPPDATA%\Tezgah` altında saklar. Önceki Eksen sürümünün yerel verileri varsa Tezgah bunları aynı konumdan kullanır.

## Çalışma alanı

- Üst çubuktan bir klasör aç. Soldaki gezginden dosya açabilir ve oluşturabilirsin. Sağdaki editörde `Ctrl+S` ile kaydet. Ortadaki çizgiyi tutup sürükleyerek editörün genişliğini değiştir.
- **Yeni ajan** ile sağlayıcı ve çalışma klasörü seç. **Ajanları yan yana göster** düğmesi bağımsız sohbetleri aynı ekranda açar. Her panelden ayrı bir görev gönderebilirsin.
- Mesaj kutusundaki model seçici üç sağlayıcıyı tek listede gösterir. Codex ve Antigravity için canlı CLI katalogları kullanılır. Katalog alınamazsa etiketli örnek seçenekler gösterilir. Claude Code model takma adlarını kendi hesabındaki modellere çözümler.
- **Plan modu** projeyi inceleyip plan hazırlar. **Kod modu** sağlayıcının izin kuralları kapsamında çalışır. Claude Code, bu sürümde etkileşimli onay gerektiren araç çağrılarını otomatik reddeder.
- Panel başlığındaki **Yanıtı başka ajana aktar** düğmesi son yanıtı seçilen ajanın mesaj taslağına ekler. Göndermeden önce içeriği düzenleyebilirsin.
- Aynı klasörü seçen ajanlar aynı disk dosyaları üzerinde çalışır. İki ajan aynı dosyayı düzenlerse değişiklikleri gözden geçir. Editör, dosya diskte değiştiğinde açık taslağı korur ve eski bir sürümün üzerine kaydetmeden önce uyarır.

## Geliştirme

Tezgah Node.js’nin yerleşik API’lerini ve tarayıcının standart özelliklerini kullanır. `npm run check` ile uygulama dosyalarının sözdizimini doğrula.

- [Codex App Server](https://learn.chatgpt.com/docs/app-server)
- [Claude Code CLI](https://code.claude.com/docs/en/cli-reference)
- [Antigravity ACP](https://antigravity.google/docs/ide/extensions/acp/)
