let folders = {};
let currentFolder = '';
let currentIndex = 0;
let isNavigating = false;
let isPaused = false;
let countdownInterval;
let nextNavigationTime;
let navigationWindowId = null;
let isEditMode = false;
let isFolderManageMode = false;
let navigationTimeout;


// DOM element references
const folderSelect = document.getElementById('folderSelect');
const newFolderInput = document.getElementById('newFolderInput');
const addFolderBtn = document.getElementById('addFolderBtn');
const deleteFolderBtn = document.getElementById('deleteFolderBtn');
const linkList = document.getElementById('linkList');
const manageLinksBtn = document.getElementById('manageLinksBtn');
const manageLinksSectionNarrow = document.getElementById('manageLinksSectionNarrow');
const singleLinkInput = document.getElementById('singleLinkInput');
const bulkLinksInput = document.getElementById('bulkLinksInput');
const addLinksBtn = document.getElementById('addLinksBtn');
const importLinksFile = document.getElementById('importLinksFile');
const importLinksBtn = document.getElementById('importLinksBtn');
const exportLinksBtn = document.getElementById('exportLinksBtn');
const loopCheckbox = document.getElementById('loopCheckbox');
const fixedDelayRadio = document.getElementById('fixedDelayRadio');
const fixedDelayInput = document.getElementById('fixedDelayInput');
const randomDelayRadio = document.getElementById('randomDelayRadio');
const minDelayInput = document.getElementById('minDelayInput');
const maxDelayInput = document.getElementById('maxDelayInput');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const stopBtn = document.getElementById('stopBtn');
const nextBtn = document.getElementById('nextBtn');
const navigationInfo = document.getElementById('navigationInfo');
const currentLinkSpan = document.getElementById('currentLink');
const countdownSpan = document.getElementById('countdown');
const editLinksBtn = document.getElementById('editLinksBtn');
editLinksBtn.addEventListener('click', toggleEditMode);
const prevBtn = document.getElementById('prevBtn');
    prevBtn.addEventListener('click', navigateToPrevious);

const exampleLists = {
    "News Sites": [
      "https://www.cnn.com",
      "https://www.foxnews.com",
      "https://www.bbc.com/news",
      "https://www.reuters.com",
      "https://www.aljazeera.com"
    ],
    "Tech Blogs": [
      "https://techcrunch.com",
      "https://www.theverge.com",
      "https://arstechnica.com",
      "https://www.engadget.com",
      "https://www.wired.com"
    ],
    "LinkedIn Influencers": [
      "https://www.linkedin.com/in/williamhgates/recent-activity/all/",
      "https://www.linkedin.com/in/rbranson/recent-activity/all/",
      "https://www.linkedin.com/in/garyvaynerchuk/recent-activity/all/",
      "https://www.linkedin.com/in/alexhormozi/recent-activity/all/",
      "https://www.linkedin.com/in/joeapfelbaum/recent-activity/all/"
    ],
  };
  
  function initializeExampleLists() {
    Object.keys(exampleLists).forEach(folderName => {
      if (!folders[folderName]) {
        folders[folderName] = exampleLists[folderName];
      }
    });
    saveFoldersToBrowser();
    updateFolderSelect();
  }

  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Load folders and update UI
    loadFoldersFromBrowser();
    
    // Notes saving functionality
    const notesTextarea = document.getElementById('notesTextarea');
    const saveNotesBtn = document.getElementById('saveNotesBtn');
    const confirmationMessage = document.createElement('p');
    const manageFoldersBtn = document.getElementById('manageFoldersBtn');
    const folderManageSection = document.getElementById('folderManageSection');
    confirmationMessage.style.color = 'green';
    confirmationMessage.style.display = 'none';
    saveNotesBtn.insertAdjacentElement('afterend', confirmationMessage);

    chrome.storage.sync.get(['savedNotes'], function (result) {
        if (result.savedNotes) {
            notesTextarea.value = result.savedNotes;
        }
    });

    saveNotesBtn.addEventListener('click', function () {
        const notes = notesTextarea.value;
        chrome.storage.sync.set({ savedNotes: notes }, function () {
            confirmationMessage.textContent = 'Notes saved successfully!';
            confirmationMessage.style.display = 'block';
            setTimeout(() => {
                confirmationMessage.style.display = 'none';
            }, 3000);
        });
    });

    // Folder and link management functionality
    addFolderBtn.addEventListener('click', () => {
        const folderName = newFolderInput.value.trim();
        if (folderName) {
            addFolder(folderName);
            newFolderInput.value = '';
        }
    });

    deleteFolderBtn.addEventListener('click', deleteFolder);

    manageFoldersBtn.addEventListener('click', toggleFolderManageMode);

    folderSelect.addEventListener('change', (e) => {
        currentFolder = e.target.value;
        updateLinkList();
    });

    manageLinksBtn.addEventListener('click', () => {
        manageLinksSectionNarrow.classList.toggle('hidden');
    });

    addLinksBtn.addEventListener('click', () => {
        const singleLink = singleLinkInput.value.trim();
        const bulkLinks = bulkLinksInput.value.trim();
        
        if (singleLink) {
            addLink(singleLink);
            singleLinkInput.value = '';
        }
        
        if (bulkLinks) {
            const linkArray = bulkLinks.split('\n').map(link => link.trim()).filter(link => link);
            linkArray.forEach(addLink);
            bulkLinksInput.value = '';
        }
    });

    startBtn.addEventListener('click', startNavigation);
    pauseBtn.addEventListener('click', pauseNavigation);
    stopBtn.addEventListener('click', stopNavigation);
    nextBtn.addEventListener('click', debouncedCustomNext);
});

function toggleFolderManageMode() {
    isFolderManageMode = !isFolderManageMode;
    manageFoldersBtn.textContent = isFolderManageMode ? 'Done Managing' : 'Manage Folders';
    folderManageSection.classList.toggle('hidden', !isFolderManageMode);
  }
  

function toggleEditMode() {
    isEditMode = !isEditMode;
    editLinksBtn.textContent = isEditMode ? 'Done Editing' : 'Edit Links';
    updateLinkList();
}

function addFolder(folderName) {
    if (folderName && !(folderName in folders)) {
        folders[folderName] = [];
        updateFolderSelect();
        saveFoldersToBrowser();
    }
}

function deleteFolder() {
    if (currentFolder) {
      if (Object.keys(exampleLists).includes(currentFolder)) {
        if (!confirm(`Are you sure you want to delete the example folder "${currentFolder}"? This action cannot be undone.`)) {
          return;
        }
      }
      delete folders[currentFolder];
      currentFolder = '';
      updateFolderSelect();
      updateLinkList();
      saveFoldersToBrowser();
    }
  }

function updateFolderSelect() {
    folderSelect.innerHTML = '<option value="">Select a folder</option>';
    for (let folder in folders) {
        const option = document.createElement('option');
        option.value = folder;
        option.textContent = folder;
        folderSelect.appendChild(option);
    }
    folderSelect.value = currentFolder;
}

function addLink(url) {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }
    if (currentFolder) {
        folders[currentFolder].push(url);
        updateLinkList();
        saveFoldersToBrowser();
    }
}

function updateLinkList() {
    linkList.innerHTML = '';
    if (currentFolder) {
        folders[currentFolder].forEach((link, index) => {
            const linkElement = document.createElement('div');
            linkElement.className = 'link-item';

            const linkNumber = document.createElement('span');
            linkNumber.textContent = `${index + 1}. `;
            linkNumber.className = 'link-number';
            linkElement.appendChild(linkNumber);

            const linkText = document.createElement('span');
            linkText.textContent = link;
            linkText.className = 'link-text';
            linkElement.appendChild(linkText);

            if (isEditMode) {
                const moveUpButton = document.createElement('button');
                moveUpButton.className = 'btn-blue edit-btn';
                moveUpButton.textContent = '↑';
                moveUpButton.addEventListener('click', () => moveLink(index, -1));
                linkElement.appendChild(moveUpButton);

                const moveDownButton = document.createElement('button');
                moveDownButton.className = 'btn-blue edit-btn';
                moveDownButton.textContent = '↓';
                moveDownButton.addEventListener('click', () => moveLink(index, 1));
                linkElement.appendChild(moveDownButton);

                const deleteButton = document.createElement('button');
                deleteButton.className = 'btn-red edit-btn';
                deleteButton.textContent = 'Delete';
                deleteButton.addEventListener('click', () => removeLink(index));
                linkElement.appendChild(deleteButton);
            } else {
                linkText.style.cursor = 'pointer';
                linkText.addEventListener('click', () => window.open(link, '_blank'));
            }

            linkList.appendChild(linkElement);
        });
    }
}

function moveLink(index, direction) {
    if (currentFolder) {
        const links = folders[currentFolder];
        if ((index === 0 && direction === -1) || (index === links.length - 1 && direction === 1)) return;
        const temp = links[index];
        links[index] = links[index + direction];
        links[index + direction] = temp;
        updateLinkList();
        saveFoldersToBrowser();
    }
}

function removeLink(index) {
    if (currentFolder) {
        folders[currentFolder].splice(index, 1);
        updateLinkList();
        saveFoldersToBrowser();
    }
}

function navigateToPrevious() {
    if (!isNavigating) return;
    clearTimeout(navigationTimeout);
    clearInterval(countdownInterval);
    currentIndex--;
    if (currentIndex < 0) {
        if (loopCheckbox.checked) {
            currentIndex = folders[currentFolder].length - 1;
        } else {
            currentIndex = 0;
        }
    }
    navigateToNext(true);
}

function startNavigation() {
    if (currentFolder && folders[currentFolder].length > 0) {
        isNavigating = true;
        isPaused = false;
        currentIndex = 0;
        startBtn.classList.add('hidden');
        pauseBtn.classList.remove('hidden');
        stopBtn.classList.remove('hidden');
        navigationInfo.classList.remove('hidden');
        navigateToNext();
    }
}

function pauseNavigation() {
    isPaused = !isPaused;
    pauseBtn.textContent = isPaused ? 'Resume Navigation' : 'Pause Navigation';
    if (!isPaused) {
        navigateToNext();
    } else {
        clearInterval(countdownInterval);
    }
}

function stopNavigation() {
    isNavigating = false;
    isPaused = false;
    startBtn.classList.remove('hidden');
    pauseBtn.classList.add('hidden');
    stopBtn.classList.add('hidden');
    navigationInfo.classList.add('hidden');
    clearInterval(countdownInterval);
    navigationWindowId = null;
}

function customNext() {
    if (!isNavigating) return;
    clearTimeout(navigationTimeout);
    clearInterval(countdownInterval);
    currentIndex++;
    if (currentIndex >= folders[currentFolder].length) {
        if (loopCheckbox.checked) {
            currentIndex = 0;
        } else {
            currentIndex = folders[currentFolder].length - 1;
        }
    }
    navigateToNext(true);
}

  const debouncedCustomNext = debounce(customNext, 300);


  function navigateToNext(isManualNavigation = false) {
    if (!isNavigating || isPaused) return;
    const links = folders[currentFolder];
    if (currentIndex >= links.length) {
        if (loopCheckbox.checked) {
            currentIndex = 0;
        } else {
            currentIndex = links.length - 1;
            stopNavigation();
            return;
        }
    }
    const currentLink = links[currentIndex];
    currentLinkSpan.textContent = currentLink;

    if (navigationWindowId === null) {
        chrome.windows.create({ url: currentLink, type: 'normal' }, (window) => {
            navigationWindowId = window.id;
        });
    } else {
        chrome.windows.update(navigationWindowId, { focused: true }, () => {
            if (chrome.runtime.lastError) {
                chrome.windows.create({ url: currentLink, type: 'normal' }, (window) => {
                    navigationWindowId = window.id;
                });
            } else {
                chrome.tabs.query({ active: true, windowId: navigationWindowId }, (tabs) => {
                    if (tabs.length > 0) {
                        chrome.tabs.update(tabs[0].id, { url: currentLink });
                    } else {
                        chrome.tabs.create({ url: currentLink, windowId: navigationWindowId });
                    }
                });
            }
        });
    }
    
    clearTimeout(navigationTimeout);
    clearInterval(countdownInterval);
    
    const delay = getDelay();
    nextNavigationTime = Date.now() + delay * 1000;
    updateCountdown();
    countdownInterval = setInterval(updateCountdown, 1000);
    
    if (!isManualNavigation) {
        navigationTimeout = setTimeout(() => {
            clearInterval(countdownInterval);
            currentIndex++;
            navigateToNext();
        }, delay * 1000);
    }
}

function getDelay() {
    if (fixedDelayRadio.checked) {
        return parseInt(fixedDelayInput.value);
    } else {
        const min = parseInt(minDelayInput.value);
        const max = parseInt(maxDelayInput.value);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}

function updateCountdown() {
    const remainingTime = Math.max(0, Math.ceil((nextNavigationTime - Date.now()) / 1000));
    countdownSpan.textContent = remainingTime;
}

function saveFoldersToBrowser() {
    chrome.storage.sync.set({ 'linkExplorerFolders': folders });
}

function loadFoldersFromBrowser() {
    chrome.storage.sync.get('linkExplorerFolders', (result) => {
      if (result.linkExplorerFolders) {
        folders = result.linkExplorerFolders;
      } else {
        folders = {};
      }
      initializeExampleLists();
    });
  }