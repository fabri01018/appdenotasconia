import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  bubbleContainer: {
    position: 'absolute',
    width: 280,
    maxWidth: '85%',
    maxHeight: '60%',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 9999,
  },
  bubbleContainerCollapsed: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 9999,
  },
  collapsedBubbleWrapper: {
    width: 60,
    height: 60,
  },
  collapsedBubble: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bubbleContainerDark: {
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  bubbleContainerLight: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    shadowOpacity: 0.15,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  headerBorderDark: {
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerBorderLight: {
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerLeft: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  projectName: {
    fontSize: 14,
    opacity: 0.7,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  collapseButton: {
    padding: 4,
  },
  closeButton: {
    padding: 4,
    marginLeft: 4,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 100,
    justifyContent: 'center',
  },
  contentScrollView: {
    maxHeight: 400,
  },
  contentScrollViewContent: {
    paddingBottom: 8,
  },
  blocksContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  emptyText: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

