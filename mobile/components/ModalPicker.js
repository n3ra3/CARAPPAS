import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, FlatList, StyleSheet,
  Platform,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

export default function ModalPicker({ items, selectedValue, onValueChange, placeholder = 'Выберите...', enabled = true }) {
  const [visible, setVisible] = useState(false);
  const { theme } = useTheme();

  const selectedItem = items.find(i => i.value === selectedValue);
  const displayText = selectedItem ? selectedItem.label : placeholder;

  const handleSelect = (value) => {
    onValueChange(value);
    setVisible(false);
  };

  const openPicker = () => {
    if (enabled && items.length > 0) {
      setVisible(true);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={[
          styles.selector,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
          },
          !enabled && styles.selectorDisabled
        ]}
        onPress={openPicker}
        activeOpacity={enabled ? 0.7 : 1}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={[
          styles.selectorText,
          { color: selectedItem ? theme.text : theme.textSecondary },
          !selectedItem && styles.placeholderText
        ]}>
          {displayText}
        </Text>
        <Text style={[styles.arrow, { color: theme.textSecondary }]}>▼</Text>
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setVisible(false)}
        statusBarTranslucent={Platform.OS === 'android'}
      >
        <View style={styles.overlay}>
          {/* Затемнение сверху — нажатие закрывает */}
          <TouchableOpacity
            style={styles.overlayDismiss}
            activeOpacity={1}
            onPress={() => setVisible(false)}
          />
          {/* Контент снизу */}
          <View style={[styles.modalContainer, { backgroundColor: theme.surface }] }>
            <View style={[styles.handleBar, { backgroundColor: theme.border }]} />
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>{placeholder}</Text>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <Text style={[styles.closeBtn, { color: theme.primary }]}>Закрыть</Text>
              </TouchableOpacity>
            </View>
            {items.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Нет доступных вариантов</Text>
              </View>
            ) : (
              <FlatList
                data={items}
                keyExtractor={(item, index) => String(item.value ?? index)}
                nestedScrollEnabled={true}
                keyboardShouldPersistTaps="handled"
                style={styles.list}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.option,
                      { borderBottomColor: theme.border },
                      item.value === selectedValue && styles.optionActive,
                      item.value === selectedValue && { backgroundColor: theme.softPrimary },
                    ]}
                    onPress={() => handleSelect(item.value)}
                  >
                    <Text style={[
                      styles.optionText,
                      { color: item.value === selectedValue ? theme.primary : theme.text },
                      item.value === selectedValue && styles.optionTextActive,
                    ]}>
                      {item.label}
                    </Text>
                    {item.value === selectedValue && (
                      <Text style={[styles.checkmark, { color: theme.primary }]}>✓</Text>
                    )}
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  selector: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectorDisabled: {
    opacity: 0.5,
  },
  selectorText: {
    fontSize: 16,
    flex: 1,
  },
  placeholderText: {
    opacity: 0.9,
  },
  arrow: {
    fontSize: 12,
    marginLeft: 8,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  overlayDismiss: {
    flex: 1,
  },
  modalContainer: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '60%',
    minHeight: 200,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  list: {
    flexGrow: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  closeBtn: {
    fontSize: 16,
    fontWeight: '500',
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  optionActive: {
    opacity: 1,
  },
  optionText: {
    fontSize: 16,
  },
  optionTextActive: {
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
  },
});
