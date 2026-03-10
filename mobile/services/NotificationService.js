import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Конфигурация обработки уведомлений
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  // Запрос разрешений на уведомления
  async requestPermissions() {
    if (!Device.isDevice) {
      console.log('Уведомления работают только на реальном устройстве');
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Разрешение на уведомления не получено');
      return false;
    }

    return true;
  }

  // Получение push-токена для Expo Push Service
  // Примечание: для работы push-уведомлений нужен реальный проект в EAS
  // Локальные уведомления работают без push-токена
  async getPushToken() {
    // Push-токен не требуется для локальных уведомлений
    // Если нужны push-уведомления, настройте проект через: npx eas init
    return null;
  }

  // Настройка канала уведомлений для Android
  async setupNotificationChannel() {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('reminders', {
        name: 'Напоминания',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2563eb',
        sound: 'default',
      });
    }
  }

  // Планирование локального уведомления
  async scheduleReminder(reminder) {
    if (reminder.is_completed || reminder.reminder_type !== 'date' || !reminder.due_date) {
      return null;
    }

    const dueDate = new Date(reminder.due_date);
    const now = new Date();

    // Устанавливаем время уведомления на 9:00 утра дня напоминания
    dueDate.setHours(9, 0, 0, 0);

    // Не планируем уведомления для прошедших дат
    if (dueDate <= now) {
      return null;
    }

    try {
      // Сначала отменяем старое уведомление для этого напоминания
      await this.cancelReminder(reminder.id);

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🚗 Напоминание',
          body: `${reminder.title}${reminder.brand_name ? ` - ${reminder.brand_name} ${reminder.model_name || ''}` : ''}`,
          data: { reminderId: reminder.id, type: 'reminder' },
          sound: 'default',
        },
        trigger: {
          date: dueDate,
          channelId: 'reminders',
        },
      });

      console.log(`Уведомление запланировано: ${notificationId} на ${dueDate}`);
      return notificationId;
    } catch (error) {
      console.error('Ошибка планирования уведомления:', error);
      return null;
    }
  }

  // Планирование напоминания за N дней до события
  async scheduleAdvanceReminder(reminder, daysBefore = 3) {
    if (reminder.is_completed || reminder.reminder_type !== 'date' || !reminder.due_date) {
      return null;
    }

    const dueDate = new Date(reminder.due_date);
    const reminderDate = new Date(dueDate);
    reminderDate.setDate(reminderDate.getDate() - daysBefore);
    reminderDate.setHours(9, 0, 0, 0);

    const now = new Date();

    if (reminderDate <= now) {
      return null;
    }

    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏰ Скоро напоминание',
          body: `Через ${daysBefore} дн.: ${reminder.title}`,
          data: { reminderId: reminder.id, type: 'advance_reminder' },
          sound: 'default',
        },
        trigger: {
          date: reminderDate,
          channelId: 'reminders',
        },
      });

      return notificationId;
    } catch (error) {
      console.error('Ошибка планирования предварительного уведомления:', error);
      return null;
    }
  }

  // Отмена уведомления по ID напоминания
  async cancelReminder(reminderId) {
    try {
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      
      for (const notification of scheduledNotifications) {
        if (notification.content.data?.reminderId === reminderId) {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        }
      }
    } catch (error) {
      console.error('Ошибка отмены уведомления:', error);
    }
  }

  // Отмена всех запланированных уведомлений
  async cancelAllReminders() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Ошибка отмены всех уведомлений:', error);
    }
  }

  // Синхронизация уведомлений с актуальными напоминаниями
  async syncReminders(reminders) {
    // Отменяем все старые уведомления
    await this.cancelAllReminders();

    // Планируем новые уведомления для активных напоминаний
    for (const reminder of reminders) {
      if (!reminder.is_completed && reminder.reminder_type === 'date') {
        await this.scheduleReminder(reminder);
        await this.scheduleAdvanceReminder(reminder, 3); // За 3 дня
      }
    }
  }

  // Планирование уведомления о документе
  async scheduleDocumentNotification(document) {
    if (!document.expiry_date) {
      return null;
    }

    const expiryDate = new Date(document.expiry_date);
    const notifyDays = document.notify_days_before || 30;
    const notifyDate = new Date(expiryDate);
    notifyDate.setDate(notifyDate.getDate() - notifyDays);
    notifyDate.setHours(9, 0, 0, 0);

    const now = new Date();

    if (notifyDate <= now) {
      return null;
    }

    try {
      // Отменяем старое уведомление
      await this.cancelDocumentNotification(document.id);

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '📄 Документ истекает',
          body: `${document.title} истекает через ${notifyDays} дней`,
          data: { documentId: document.id, type: 'document' },
          sound: 'default',
        },
        trigger: {
          date: notifyDate,
          channelId: 'reminders',
        },
      });

      console.log(`Уведомление о документе запланировано: ${notificationId}`);
      return notificationId;
    } catch (error) {
      console.error('Ошибка планирования уведомления о документе:', error);
      return null;
    }
  }

  // Отмена уведомления о документе
  async cancelDocumentNotification(documentId) {
    try {
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      
      for (const notification of scheduledNotifications) {
        if (notification.content.data?.documentId === documentId) {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        }
      }
    } catch (error) {
      console.error('Ошибка отмены уведомления о документе:', error);
    }
  }

  // Синхронизация уведомлений документов
  async syncDocuments(documents) {
    for (const doc of documents) {
      if (doc.expiry_date) {
        await this.scheduleDocumentNotification(doc);
      }
    }
  }

  // Получение списка запланированных уведомлений (для отладки)
  async getScheduledNotifications() {
    return await Notifications.getAllScheduledNotificationsAsync();
  }

  // Отправка тестового уведомления
  async sendTestNotification() {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🔔 Тест',
        body: 'Уведомления работают!',
        sound: 'default',
      },
      trigger: null, // Немедленно
    });
  }
}

export default new NotificationService();
