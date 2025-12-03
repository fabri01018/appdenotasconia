import { useState } from 'react';

export function useTaskModals() {
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [showTagsModal, setShowTagsModal] = useState(false);
  const [showPromptsModal, setShowPromptsModal] = useState(false);

  const openProjectModal = () => setShowProjectModal(true);
  const closeProjectModal = () => setShowProjectModal(false);
  
  const openMenuModal = () => setShowMenuModal(true);
  const closeMenuModal = () => setShowMenuModal(false);
  
  const openSectionModal = () => {
    setShowMenuModal(false);
    setShowSectionModal(true);
  };
  const closeSectionModal = () => setShowSectionModal(false);
  
  const openTagsModal = () => {
    setShowMenuModal(false);
    setShowTagsModal(true);
  };
  const closeTagsModal = () => setShowTagsModal(false);
  
  const openPromptsModal = () => {
    setShowMenuModal(false);
    setShowPromptsModal(true);
  };
  const closePromptsModal = () => setShowPromptsModal(false);

  return {
    showProjectModal,
    showMenuModal,
    showSectionModal,
    showTagsModal,
    showPromptsModal,
    openProjectModal,
    closeProjectModal,
    openMenuModal,
    closeMenuModal,
    openSectionModal,
    closeSectionModal,
    openTagsModal,
    closeTagsModal,
    openPromptsModal,
    closePromptsModal,
  };
}

