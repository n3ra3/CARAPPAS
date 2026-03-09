// Конфигурация приложения
// Измените API_URL на IP-адрес вашего компьютера в локальной сети
// Чтобы узнать IP: Windows - ipconfig, Mac/Linux - ifconfig

// Для эмулятора Android используйте: 10.0.2.2 (это localhost хост-машины)
// Для реального устройства в той же сети используйте IP компьютера, например: 192.168.1.100

// export const API_URL = 'http://10.0.2.2:3000/api'; // Для эмулятора Android
// export const API_URL = 'http://192.168.0.24:3000/api'; // Для реального устройства
export const API_URL = 'https://disordered-irrecoverably-christie.ngrok-free.dev/api'; // ngrok tunnel

export default {
  API_URL,
};
