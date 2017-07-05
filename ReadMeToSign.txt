in root folder run:
keytool -genkey -v -keystore MobilisWay.keystore -alias MobilisWay -keyalg RSA -keysize 2048 -validity 10000
ionic build android --release --buildConfig