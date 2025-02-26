/**
 * 模型管理模块 - 处理模型列表和测试功能
 */

import { fetchModels, testModel } from './api-services.js';
import { createLoadingAnimation, createModelTestTable, copyToClipboard } from './ui-utils.js';

/**
 * 获取并显示模型列表
 * @param {string} endpoint - 接口地址
 * @param {string} apiKey - API密钥
 */
export async function loadModelList(endpoint, apiKey) {
  const modelSelect = document.getElementById("modelSelect");
  const modelCheckboxes = document.getElementById("modelCheckboxes");
  const resultDiv = document.getElementById("result");

  if (!modelSelect || !modelCheckboxes) return;

  // 添加加载动画
  modelCheckboxes.innerHTML = createLoadingAnimation("正在获取模型列表...");

  try {
    const models = await fetchModels(endpoint, apiKey);

    // 清空现有选项
    modelSelect.innerHTML = "";
    modelCheckboxes.innerHTML = `
      <div class="model-select-all">
        <button type="button" id="selectAllModels">全选</button>
        <button type="button" id="deselectAllModels">取消全选</button>
      </div>
    `;

    if (models.length > 0) {
      // 添加下拉选项和复选框
      models.forEach((model) => {
        const option = document.createElement("option");
        option.value = model.id;
        option.textContent = model.id;
        modelSelect.appendChild(option);

        // 添加复选框
        const checkboxDiv = document.createElement("div");
        checkboxDiv.className = "model-checkbox-item";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.id = `model-${model.id}`;
        checkbox.value = model.id;

        const label = document.createElement("label");
        label.htmlFor = `model-${model.id}`;
        label.textContent = model.id;

        checkboxDiv.appendChild(checkbox);
        checkboxDiv.appendChild(label);
        modelCheckboxes.appendChild(checkboxDiv);
      });

      // 添加全选/取消全选功能
      addModelSelectionListeners();

      if (resultDiv) {
        resultDiv.innerHTML = "✅ 成功获取模型列表";
      }
    } else {
      modelSelect.innerHTML = '<option value="gpt-3.5-turbo">gpt-3.5-turbo</option>';
      throw new Error("未找到可用模型");
    }
  } catch (error) {
    console.error("获取模型列表错误:", error);
    modelSelect.innerHTML = '<option value="gpt-3.5-turbo">gpt-3.5-turbo</option>';
    if (resultDiv) {
      resultDiv.innerHTML = `❌ 获取模型列表失败：${error.message}`;
    }
  }
}

/**
 * 添加模型选择相关的事件监听器
 */
function addModelSelectionListeners() {
  const selectAllBtn = document.getElementById("selectAllModels");
  const deselectAllBtn = document.getElementById("deselectAllModels");
  const modelCheckboxes = document.getElementById("modelCheckboxes");

  if (selectAllBtn) {
    selectAllBtn.addEventListener("click", () => {
      const checkboxes = modelCheckboxes.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach((checkbox) => (checkbox.checked = true));
    });
  }

  if (deselectAllBtn) {
    deselectAllBtn.addEventListener("click", () => {
      const checkboxes = modelCheckboxes.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach((checkbox) => (checkbox.checked = false));
    });
  }
}

/**
 * 获取选中的模型列表
 * @returns {Array} - 选中的模型ID数组
 */
export function getSelectedModels() {
  const checkboxes = document.querySelectorAll("#modelCheckboxes input[type='checkbox']:checked");
  return Array.from(checkboxes).map((cb) => cb.value);
}

/**
 * 复制选中的模型到剪贴板
 * @param {HTMLElement} button - 触发复制的按钮元素
 * @returns {Promise<boolean>} - 是否复制成功
 */
export async function copySelectedModels(button) {
  const selectedModels = getSelectedModels();
  if (selectedModels.length === 0) {
    document.getElementById("result").innerHTML = "⚠️ 请先选择要复制的模型";
    return false;
  }

  const modelText = selectedModels.join(",");
  return await copyToClipboard(modelText, button);
}

/**
 * 测试选中的模型
 * @param {string} endpoint - 接口地址
 * @param {string} apiKey - API密钥
 * @returns {Promise<void>}
 */
export async function testSelectedModels(endpoint, apiKey) {
  const selectedModels = getSelectedModels();
  const resultDiv = document.getElementById("result");

  if (!selectedModels.length) {
    resultDiv.innerHTML = "⚠️ 请先选择要测试的模型";
    return;
  }

  resultDiv.innerHTML = "正在测试选中的模型，请稍候...";

  const results = [];
  
  // 逐个测试模型
  for (const selectedModel of selectedModels) {
    const result = await testModel(endpoint, apiKey, selectedModel);
    results.push(result);
    
    // 每测试完一个模型就更新一次结果显示
    resultDiv.innerHTML = createModelTestTable(results);
  }

  // 添加复制按钮的事件监听
  addCopyButtonsListeners(results);
}

/**
 * 为测试结果表格中的复制按钮添加事件监听器
 * @param {Array} results - 测试结果数组
 */
function addCopyButtonsListeners(results) {
  const copyAvailableBtn = document.getElementById("copyAvailableModels");
  const copyMatchedBtn = document.getElementById("copyMatchedModels");

  if (copyAvailableBtn) {
    copyAvailableBtn.addEventListener("click", function() {
      const availableModels = results
        .filter((result) => result.status === "✅")
        .map((result) => result.model);

      copyToClipboard(availableModels.join(","), this);
    });
  }

  if (copyMatchedBtn) {
    copyMatchedBtn.addEventListener("click", function() {
      const matchedModels = results
        .filter((result) => result.modelMatch === "✅")
        .map((result) => result.model);

      copyToClipboard(matchedModels.join(","), this);
    });
  }
}
