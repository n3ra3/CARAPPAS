import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, FlatList, StyleSheet,
  Platform,
} from 'react-native';

export default function ModalPicker({ items, selectedValue, onValueChange, placeholder = 'Выберите...', enabled = true }) {
  const [visible, setVisible] = useState(false);

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
        style={[styles.selector, !enabled && styles.selectorDisabled]}
        onPress={openPicker}
        activeOpacity={enabled ? 0.7 : 1}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={[styles.selectorText, !selectedItem && styles.placeholderText]}>
          {displayText}
        </Text>
        <Text style={styles.arrow}>▼</Text>
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
          <View style={styles.modalContainer}>
            <View style={styles.handleBar} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{placeholder}</Text>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <Text style={styles.closeBtn}>Закрыть</Text>
              </TouchableOpacity>
            </View>
            {items.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Нет доступных вариантов</Text>
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
                      item.value === selectedValue && styles.optionActive,
                    ]}
                    onPress={() => handleSelect(item.value)}
                  >
                    <Text style={[
                      styles.optionText,
                      item.value === selectedValue && styles.optionTextActive,
                    ]}>
                      {item.label}
                    </Text>
                    {item.value === selectedValue && (
                      <Text style={styles.checkmark}>✓</Text>
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
    color: '#1e293b',
    flex: 1,
  },
  placeholderText: {
    color: '#94a3b8',
  },
  arrow: {
    fontSize: 12,
    color: '#94a3b8',
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
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '60%',
    minHeight: 200,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#d1d5db',
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
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1e293b',
  },
  closeBtn: {
    fontSize: 16,
    color: '#2563eb',
    fontWeight: '500',
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  optionActive: {
    backgroundColor: '#eff6ff',
  },
  optionText: {
    fontSize: 16,
    color: '#1e293b',
  },
  optionTextActive: {
    color: '#2563eb',
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 18,
    color: '#2563eb',
    fontWeight: '700',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#94a3b8',
  },
});
