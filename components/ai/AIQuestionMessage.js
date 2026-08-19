import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

/**
 * Renders a structured question from the AI with tappable option buttons.
 *
 * Props:
 *  - questionText  {string}   The question to display above the options.
 *  - options       {string[]} Pre-made answer choices.
 *  - answered      {string|null} The option the user already picked, or null.
 *  - onSelect      {(option: string) => void} Called when a pre-made option is tapped.
 *  - onOther       {() => void} Called when the "Other…" button is tapped.
 */
export default function AIQuestionMessage({ questionText, options = [], answered, onSelect, onOther }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View style={styles.container}>
      {!!questionText && (
        <ThemedText style={[styles.questionText, isDark ? styles.questionTextDark : styles.questionTextLight]}>
          {questionText}
        </ThemedText>
      )}

      <View style={styles.optionsContainer}>
        {options.map((option, index) => {
          const isSelected = answered === option;
          const isDisabled = !!answered;

          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.optionButton,
                isDark ? styles.optionButtonDark : styles.optionButtonLight,
                isSelected && styles.optionButtonSelected,
                isDisabled && !isSelected && styles.optionButtonDisabled,
              ]}
              onPress={() => !isDisabled && onSelect?.(option)}
              activeOpacity={isDisabled ? 1 : 0.7}
              disabled={isDisabled}
            >
              {isSelected && (
                <Ionicons
                  name="checkmark-circle"
                  size={15}
                  color="#fff"
                  style={styles.checkIcon}
                />
              )}
              <ThemedText
                style={[
                  styles.optionText,
                  isSelected && styles.optionTextSelected,
                  isDisabled && !isSelected && (isDark ? styles.optionTextDisabledDark : styles.optionTextDisabledLight),
                ]}
              >
                {option}
              </ThemedText>
            </TouchableOpacity>
          );
        })}

        {/* "Other…" button — only shown while unanswered */}
        {!answered && (
          <TouchableOpacity
            style={[
              styles.optionButton,
              styles.otherButton,
              isDark ? styles.otherButtonDark : styles.otherButtonLight,
            ]}
            onPress={onOther}
            activeOpacity={0.7}
          >
            <Ionicons
              name="create-outline"
              size={14}
              color={isDark ? '#9BA1A6' : '#687076'}
              style={styles.checkIcon}
            />
            <ThemedText style={[styles.optionText, isDark ? styles.otherTextDark : styles.otherTextLight]}>
              Other…
            </ThemedText>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    gap: 10,
  },
  questionText: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 21,
  },
  questionTextDark: { color: '#E4E4E7' },
  questionTextLight: { color: '#18181B' },

  optionsContainer: {
    gap: 8,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  optionButtonDark: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.15)',
  },
  optionButtonLight: {
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderColor: 'rgba(0,0,0,0.12)',
  },
  optionButtonSelected: {
    backgroundColor: '#0a7ea4',
    borderColor: '#0a7ea4',
  },
  optionButtonDisabled: {
    opacity: 0.4,
  },

  otherButton: {
    borderStyle: 'dashed',
  },
  otherButtonDark: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(255,255,255,0.2)',
  },
  otherButtonLight: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(0,0,0,0.18)',
  },

  checkIcon: {
    marginRight: 7,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
    flexShrink: 1,
  },
  optionTextSelected: {
    color: '#fff',
  },
  optionTextDisabledDark: { color: '#52525B' },
  optionTextDisabledLight: { color: '#A1A1AA' },
  otherTextDark: { color: '#9BA1A6' },
  otherTextLight: { color: '#687076' },
});
