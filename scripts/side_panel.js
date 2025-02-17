// 支持图像的模型
const IMAGE_SUPPORT_MODELS = ['gpt-4-turbo', 'gpt-4o', 'gemini-1.0-pro-vision-latest', 'gemini-1.5-pro-latest', 'gemini-1.5-flash-latest'];
const ANY_FILE_SUPPORT_MODELS = ['gemini-1.5-pro-latest', 'gemini-1.5-flash-latest'];
const DEFAULT_LOGO_PATH = "/images/file.png";

/**
 * 判断是否设置api key
 * @returns
 */
async function verifyApiKeyConfigured(model) {
  const {baseUrl, apiKey} = await getBaseUrlAndApiKey(model);
  // console.log('baseulr', baseUrl);
  // console.log('apiKey', apiKey);
  if(baseUrl == null || apiKey == null) {
    // 隐藏初始推荐内容
    const sloganDiv = document.querySelector('.my-extension-slogan');
    sloganDiv.style.display = 'none';
    const featureDiv = document.querySelector('.feature-container');
    featureDiv.style.display = 'none';
    // 初始化对话内容 
    var contentDiv = document.querySelector('.chat-content');
    contentDiv.innerHTML = DEFAULT_TIPS;
    return false;
  }
  return true;
}

/**
 * 隐藏初始推荐内容
 */
function hideRecommandContent() {
  const sloganDiv = document.querySelector('.my-extension-slogan');
  sloganDiv.style.display = 'none';
  const featureDiv = document.querySelector('.feature-container');
  featureDiv.style.display = 'none';
}

/**
 * 展示初始推荐内容
 */
function showRecommandContent() {
  const sloganDiv = document.querySelector('.my-extension-slogan');
  sloganDiv.style.display = '';
  const featureDiv = document.querySelector('.feature-container');
  featureDiv.style.display = '';
}

/**
 * 定义清空并加载内容的函数
 */
async function clearAndGenerate(model, contentObj) {
  // 隐藏初始推荐内容
  hideRecommandContent();

  // clean
  const contentDiv = document.querySelector('.chat-content');
  contentDiv.innerHTML = '';

  // generate
  await chatLLMAndUIUpdate(model, contentObj);
}

/**
 * 调用模型 & 更新ui
 * @param {string} model 
 * @param {string} content 
 */
async function chatLLMAndUIUpdate(model, contentObj) {
  // loading
  const loadingDiv = document.querySelector('.my-extension-loading');
  loadingDiv.style.display = 'flex';

  // submit & generating button
  hideSubmitBtnAndShowGenBtn();
  
  // 创建AI回答div
  const aiContentDiv = document.createElement('div');
  aiContentDiv.className = 'ai-message';
  const contentDiv = document.querySelector('.chat-content');
  contentDiv.appendChild(aiContentDiv);
    
  try {
    const completeText = await chatWithLLM(model, contentObj, CHAT_TYPE);
    createCopyButton(aiContentDiv, completeText);
  } catch (error) {
    loadingDiv.style.display = 'none'; 
    updateChatContent("<p>发生了一些未知的错误！</p>");
    console.error('Failed to fetch:', error);
  } finally {
    // submit & generating button
    showSubmitBtnAndHideGenBtn();
  }
}

/**
 * 生成复制按钮
 * @param {object} aiContentDiv 
 * @param {string} completeText 
 */
function createCopyButton(aiContentDiv, completeText) {
  const copySvg = document.querySelector('.icon-copy').cloneNode(true);
  copySvg.style.display = 'block';

  copySvg.addEventListener('click', function() {
      navigator.clipboard.writeText(completeText).then(() => {
         // copy success...
      }).catch(err => {
          console.error('复制失败:', err);
      });
  });

  aiContentDiv.appendChild(copySvg);
}


/**
 * 隐藏提交按钮 & 展示生成按钮
 */
function hideSubmitBtnAndShowGenBtn() {
  const submitBtn = document.querySelector('#my-extension-submit-btn');
  submitBtn.style.cssText = 'display: none !important';
  const generateBtn = document.querySelector('#my-extension-generate-btn');
  generateBtn.style.cssText = 'display: flex !important';
  const inputBtn = document.querySelector('#my-extension-user-input');
  inputBtn.disabled = true;
}

/**
 * 展示提交按钮 & 隐藏生成按钮
 */
function showSubmitBtnAndHideGenBtn() {
  const submitBtn = document.querySelector('#my-extension-submit-btn');
  submitBtn.style.cssText = 'display: flex !important';
  updateSubmitButton();
  const generateBtn = document.querySelector('#my-extension-generate-btn');
  generateBtn.style.cssText = 'display: none !important';
  const inputBtn = document.querySelector('#my-extension-user-input');
  inputBtn.disabled = false;
}

/**
 * 根据选择的模型判断是否支持上传图像或文件
 * @param {string} selectedModel 
 */
function toggleImageUpload(selectedModel) {
  const imageUploadDiv = document.getElementById('image-upload-div');
  const imageUpload = document.getElementById('image-upload');
  const imageUploadLabel = document.getElementById('image-upload-label');
  if (IMAGE_SUPPORT_MODELS.includes(selectedModel)) {
      // 如果模型支持图像，启用上传区域
      imageUploadDiv.style.opacity = '1';
      imageUpload.disabled = false;
      imageUploadLabel.style.pointerEvents = 'auto';
      imageUpload.setAttribute('accept', 'image/*');
      if(ANY_FILE_SUPPORT_MODELS.includes(selectedModel)) {
        imageUpload.removeAttribute('accept');
      }
  } else {
      // 如果模型不支持图像，禁用上传区域
      imageUploadDiv.style.opacity = '0.5';
      imageUpload.disabled = true;
      imageUploadLabel.style.pointerEvents = 'none';
  }
}

function loadImage(imgElement) {
  return new Promise((resolve, reject) => {
      if (imgElement.complete && imgElement.naturalHeight !== 0) {
          resolve();
      } else {
          imgElement.onload = () => resolve();
          imgElement.onerror = () => reject(new Error('Image failed to load: ' + imgElement.src));
      }
  });
}

async function loadAllImages(element) {
  const imgElements = element.querySelectorAll('img');
  const loadPromises = Array.from(imgElements).map(img => loadImage(img));
  return Promise.all(loadPromises);
}

/**
 * 更新提交按钮状态
 */
function updateSubmitButton() {
  const userInput = document.getElementById('my-extension-user-input');
  const submitButton = document.getElementById('my-extension-submit-btn');
  const previewArea = document.querySelector('.image-preview-area');
  const hasUploadedImages = previewArea.querySelectorAll('.uploaded-image-preview[data-uploaded-url]').length > 0;

  if (userInput.value.trim() !== '' || hasUploadedImages) {
    submitButton.disabled = false;
    submitButton.classList.remove('disabled');
  } else {
      submitButton.disabled = true;
      submitButton.classList.add('disabled');
  }
}

function toggleShortcutMenu(inputField, shortcutMenu) {
  if (inputField.value === '/') {
      shortcutMenu.style.display = 'block';
  } else {
      shortcutMenu.style.display = 'none';
  }
}

function handleUploadFiles(event) {
  var files = event.target.files;
  var previewArea = document.querySelector('.image-preview-area');
  const submitButton = document.getElementById('my-extension-submit-btn');

  // 禁用提交按钮
  submitButton.disabled = true;
  submitButton.classList.add('disabled');

  // 追踪未完成的上传数量
  let uploadCount = files.length;

  Array.from(files).forEach(file => {
    var imgContainer = document.createElement('div');
    imgContainer.classList.add('img-container');

    var img = document.createElement('img');
    img.classList.add('uploaded-image-preview');

    // 删除按钮
    var deleteBtn = document.getElementById('delete-icon-template').cloneNode(true);
    deleteBtn.style.display = 'block';
    deleteBtn.classList.add('delete-image-btn');
    deleteBtn.removeAttribute('id');
    deleteBtn.addEventListener('click', function() {
        previewArea.removeChild(imgContainer);
    });

    // 预览
    var reader = new FileReader();
    reader.onload = function(e) {
      if (file.type.startsWith('image/')) {
        img.src = e.target.result;
      } else {
        img.src = DEFAULT_LOGO_PATH;
      }
      img.setAttribute('data-base64', e.target.result);
      uploadCount--;
      if (uploadCount === 0) {
        updateSubmitButton();
      }
    };
    reader.readAsDataURL(file);

    imgContainer.appendChild(img);
    imgContainer.appendChild(deleteBtn);
    previewArea.appendChild(imgContainer);
  });

  // 清空文件输入
  var uploadInput = document.getElementById('image-upload');
  uploadInput.value = '';
  updateSubmitButton();
}


/**
 * 初始化结果页面
 */
function initResultPage() {
    // 模型选择变更逻辑
    const modelSelection = document.getElementById('model-selection');
    chrome.storage.sync.get(['selectedModel'], function(result) {
      if (result.selectedModel) {
          modelSelection.value = result.selectedModel;
      }
      toggleImageUpload(modelSelection.value);
    });
    modelSelection.addEventListener('change', function() {
        toggleImageUpload(this.value);
        chrome.storage.sync.set({'selectedModel': this.value});
    });

    // 初始化按钮状态
    updateSubmitButton();

    // 检测输入框内容变化以更新提交按钮状态
    var userInput = document.getElementById('my-extension-user-input');
    userInput.addEventListener('input', updateSubmitButton);

    // 快捷输入
    const shortcutMenu = document.getElementById('shortcut-menu');
    userInput.addEventListener('input', function(e) {
      toggleShortcutMenu(userInput, shortcutMenu);
    });

    userInput.addEventListener('keydown', function(e) {
      if (e.key === '/' && userInput.value.length === 0) {
        toggleShortcutMenu(userInput, shortcutMenu);
      }
    });

    userInput.addEventListener('blur', function() {
      setTimeout(() => {
          shortcutMenu.style.display = 'none';
      }, 200); // delay to allow click event on menu items
    });

    const menuItems = shortcutMenu.querySelectorAll('div');
    menuItems.forEach(item => {
        item.addEventListener('click', function() {
          userInput.value = this.getAttribute('data-command');
          shortcutMenu.style.display = 'none';
          userInput.focus();
        });
    });

    // 图片上传预览
    document.getElementById('image-upload').addEventListener('change', function(event) {
      handleUploadFiles(event);
    });

    // 粘贴
    document.addEventListener('paste', async (event) => {
      const items = event.clipboardData.items;
      let files = [];
      for (let item of items) {
          if (item.type.startsWith('image')) {
              const file = item.getAsFile();
              files.push(file);
          }
      }
      if (files.length > 0) {
        handleUploadFiles({ target: { files: files } });
      }
    });

    // 清空历史记录逻辑
    var label = document.getElementById('newchat-label');
    label.addEventListener('click', function() {
      // 清空聊天记录
      const contentDiv = document.querySelector('.chat-content');
      contentDiv.innerHTML = '';
      // 清空上传图片预览界面
      const previewArea = document.querySelector('.image-preview-area');
      previewArea.innerHTML = '';
      // 清空历史记录
      initChatHistory();
      // 展示推荐内容
      showRecommandContent();
    });
  
    // 摘要逻辑
    var summaryButton = document.querySelector('#my-extension-summary-btn');
    summaryButton.addEventListener('click', async function() {
      const model = modelSelection.value;
      const apiKeyValid = await verifyApiKeyConfigured(model);
      if(!apiKeyValid) {
        return;
      }
      let inputText = '';
      const currentURL = await getCurrentURL();
      if(isVideoUrl(currentURL)) {
        // 视频摘要
        inputText = await extractSubtitles(currentURL, FORMAT_TEXT);
      } else if(isPDFUrl(currentURL)) {
        // PDF摘要
        inputText = await extractPDFText(currentURL);
      } else {
        // 网页摘要
        inputText = await fetchPageContent(FORMAT_TEXT);
      }

      // 构造content
      const contentObj = generateLLMContent(SUMMARY_PROMPT + inputText);

      await clearAndGenerate(model, contentObj);
    });

    // 网页翻译
    var translateButton = document.querySelector('#my-extension-translate-btn');
    translateButton.addEventListener('click', async function() {
      const model = modelSelection.value;
      const apiKeyValid = await verifyApiKeyConfigured(model);
      if(!apiKeyValid) {
        return;
      }
      let inputText = '';
      const currentURL = await getCurrentURL();
      if(isVideoUrl(currentURL)) {
        // 视频翻译
        inputText = await extractSubtitles(currentURL, FORMAT_TEXT);
      } else if(isPDFUrl(currentURL)) {
        // PDF 翻译
        inputText = await extractPDFText(currentURL);
      } else {
        // 网页翻译
        inputText = await fetchPageContent();
      }

      // 构造content
      const contentObj = generateLLMContent(TRANSLATE2CHN_PROMPT + inputText);

      await clearAndGenerate(model, contentObj);
    });

    // 视频翻译
    var videoTranslateButton = document.querySelector('#my-extension-videotrans-btn');
    videoTranslateButton.addEventListener('click', async function() {
      const model = modelSelection.value;
      const apiKeyValid = await verifyApiKeyConfigured(model);
      if(!apiKeyValid) {
        return;
      }
      const currentURL = await getCurrentURL();
      if(!isVideoUrl(currentURL)) {
        return;
      }

      // 视频翻译
      const inputText = await extractSubtitles(currentURL, FORMAT_TEXT);

      // 构造content
      const contentObj = generateLLMContent(SUBTITLE2CHN_PROMPT + inputText);

      await clearAndGenerate(model, contentObj);
    });


    // 停止生成逻辑
    var cancelBtn = document.querySelector('#my-extension-generate-btn');
    cancelBtn.addEventListener('click', function() {
      cancelRequest();
      showSubmitBtnAndHideGenBtn();
    });

    // 设置逻辑
    var settingsButton = document.querySelector('.my-extension-settings-btn');
    if (settingsButton) {
      settingsButton.addEventListener('click', function() {
        // 发送消息到background script打开新标签页
        chrome.runtime.sendMessage({ action: "openSettings" });
      });
    }

    // 分享逻辑
    var shareButton = document.querySelector('.my-extension-share-btn');
    if(shareButton) {
      shareButton.addEventListener('click', async function() {
        const contentDiv = document.querySelector('.my-extension-content');

        // 等待所有图片加载完成
        try {
          const chatDiv = document.querySelector('.chat-content');
          await loadAllImages(chatDiv);
        } catch (error) {
          console.error('Some images failed to load:', error);
          return;
        }
         
        // 保存原始样式
        var originalStyle = {
            height: contentDiv.style.height,
            width: contentDiv.style.width
        };
        html2canvas(contentDiv, {
          onclone: function(clonedDoc) {
             var clonedContentDiv = clonedDoc.querySelector('.my-extension-content');
             if (clonedContentDiv) {
              clonedContentDiv.style.position = 'static';
              clonedContentDiv.style.overflow = 'visible';
              clonedContentDiv.style.height = originalStyle.height;
              clonedContentDiv.style.width = originalStyle.width;
             }
          },
          backgroundColor: '#111827',
          useCORS: true
        }).then(canvas => {
          canvas.toBlob(function(blob) {
            var url = URL.createObjectURL(blob);
            window.open(url, '_blank');
          }, 'image/png');
        }).catch(error => {
          console.error('Error rendering canvas:', error);
        });
      });
    }

    // 对话逻辑
    var userInput = document.getElementById('my-extension-user-input');
    var submitButton = document.getElementById('my-extension-submit-btn');
    if (submitButton) {
        submitButton.addEventListener('click', async function() {
          const model = modelSelection.value;
          const apiKeyValid = await verifyApiKeyConfigured(model);
          if(!apiKeyValid) {
            return;
          }
          if (userInput.value.trim() !== '') {
            // 隐藏初始推荐内容
            hideRecommandContent();

            const inputText = userInput.value;

            // 获取图像url
            var images = document.querySelectorAll('.uploaded-image-preview');
            var base64Images = [];
            images.forEach(img => {
                var imageBase64 = img.getAttribute('data-base64');
                if (imageBase64) {
                  base64Images.push(imageBase64);
                }
            });

            // 创建用户问题div
            const userQuestionDiv = document.createElement('h1');
            userQuestionDiv.className = 'user-message';
            let userMessage = '';
            base64Images.forEach(url => {
              if(!url.includes('image')) {
                url = DEFAULT_LOGO_PATH;
              }
              userMessage += "<img src='"+ url +"' />"
            });
            userMessage += inputText;
            userQuestionDiv.innerHTML = userMessage;

            const contentDiv = document.querySelector('.chat-content');
            contentDiv.appendChild(userQuestionDiv);

            // 构造content
            let newInputText = '';
            if(inputText.startsWith(SHORTCUT_SUMMAY)) {
              newInputText = SUMMARY_PROMPT + inputText.replace(SHORTCUT_SUMMAY, '') ;
            } else if(inputText.startsWith(SHORTCUT_TRANSLATION)) {
              newInputText = TRANSLATION_PROMPT + inputText.replace(SHORTCUT_TRANSLATION, '') ;
            } else if(inputText.startsWith(SHORTCUT_POLISH)) {
              newInputText = TEXT_POLISH_PROMTP + inputText.replace(SHORTCUT_POLISH, '');
            } else if(inputText.startsWith(SHORTCUT_CODE_EXPLAIN)) {
              newInputText = CODE_EXPLAIN_PROMTP + inputText.replace(SHORTCUT_CODE_EXPLAIN, '');
            } else if(inputText.startsWith(SHORTCUT_IMAGE2TEXT)) {
              newInputText = IMAGE2TEXT_PROMPT + inputText.replace(SHORTCUT_IMAGE2TEXT, '');
            } else {
              newInputText = inputText;
            }

            const contentObj = generateLLMContent(newInputText.trim(), base64Images);

            // 滚动到底部
            contentDiv.scrollTop = contentDiv.scrollHeight;

            // 清空输入框内容
            userInput.value = "";

            // 清空上传图片预览界面
            const previewArea = document.querySelector('.image-preview-area');
            previewArea.innerHTML = '';

            // AI 回答
            chatLLMAndUIUpdate(model, contentObj);
          }
        });
    }

    // 使回车键触发提交按钮点击
    if (userInput) {
      userInput.addEventListener('keypress', function(event) {
          if (event.key === 'Enter') { 
            event.preventDefault(); // 阻止默认事件
            if (userInput.value.trim() !== '') {
              submitButton.click();
            }
          }
      });
    }
}


/**
 * 是否是视频页面
 * @returns 
 */
function isVideoUrl(url) {
  const patterns = [
    /^https?:\/\/(?:www\.)?youtube\.com\/watch/, // 匹配 YouTube 观看页面
    /^https?:\/\/(?:www\.)?bilibili\.com\/video\//, // 匹配 Bilibili 视频页面
    /^https?:\/\/(?:www\.)?bilibili\.com\/list\/watchlater/ // 匹配 Bilibili 稍后再看页面
  ];
  
  return patterns.some(pattern => pattern.test(url));
}
 

/**
 * 主程序
 */ 
document.addEventListener('DOMContentLoaded', function() {
  initResultPage();
});

