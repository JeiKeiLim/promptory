/**
 * 파라미터 편집 컴포넌트
 */

import React, { useState, useEffect } from 'react';
import type { PromptParameter } from '@shared/types/prompt';
import { validateParameterName } from '@renderer/utils/parameterParser';
import { useTranslation } from 'react-i18next';

interface ParameterEditorProps {
  parameters: PromptParameter[];
  onChange: (parameters: PromptParameter[]) => void;
  detectedParams?: string[]; // 마크다운에서 자동 감지된 파라미터
}

export const ParameterEditor: React.FC<ParameterEditorProps> = ({
  parameters,
  onChange,
  detectedParams = []
}) => {
  const { t } = useTranslation();
  const [editingParam, setEditingParam] = useState<string | null>(null);
  const [newParamName, setNewParamName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // 자동으로 추가된 파라미터들 (기본 설명을 가진 것들)
  const autoAddedParams = parameters.filter(
    param => param.description === `${param.name} 파라미터`
  );

  // 파라미터 추가
  const handleAddParameter = (name: string, fromDetected: boolean = false) => {
    const validation = validateParameterName(name);
    if (!validation.isValid) {
      alert(validation.error);
      return;
    }

    if (parameters.some(p => p.name === name)) {
      alert(t('parameterEditor.duplicateParam'));
      return;
    }

    const newParam: PromptParameter = {
      name,
      type: 'string',
      required: true,
      description: `${name} 파라미터`
    };

    onChange([...parameters, newParam]);
    
    if (!fromDetected) {
      setNewParamName('');
      setShowAddForm(false);
    }
  };

  // 파라미터 수정
  const handleUpdateParameter = (index: number, updates: Partial<PromptParameter>) => {
    const updatedParams = [...parameters];
    updatedParams[index] = { ...updatedParams[index], ...updates };
    onChange(updatedParams);
  };

  // 파라미터 삭제
  const handleDeleteParameter = (index: number) => {
    if (confirm(t('parameterEditor.confirmDelete'))) {
      const updatedParams = parameters.filter((_, i) => i !== index);
      onChange(updatedParams);
    }
  };

  // 파라미터 순서 변경
  const handleMoveParameter = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= parameters.length) return;

    const updatedParams = [...parameters];
    [updatedParams[index], updatedParams[newIndex]] = [updatedParams[newIndex], updatedParams[index]];
    onChange(updatedParams);
  };

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          {t('parameterEditor.parameterSettings')} ({parameters.length})
        </h3>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {t('parameterEditor.addParameter')}
        </button>
      </div>

      {/* 자동 추가된 파라미터 알림 */}
      {autoAddedParams.length > 0 && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <span className="text-blue-600">✨</span>
            </div>
            <div className="ml-3 flex-1">
              <h4 className="text-sm font-medium text-blue-800">
                {t('parameterEditor.autoAdded', { count: autoAddedParams.length })}
              </h4>
              <p className="text-xs text-blue-700 mt-1">
                {t('parameterEditor.autoAddedDesc')}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {autoAddedParams.map(param => (
                  <span
                    key={param.name}
                    className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded font-mono"
                  >
                    {`{{${param.name}}}`}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 파라미터 추가 폼 */}
      {showAddForm && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={newParamName}
              onChange={(e) => setNewParamName(e.target.value)}
              placeholder={t('parameterEditor.paramNamePlaceholder')}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddParameter(newParamName);
                } else if (e.key === 'Escape') {
                  setShowAddForm(false);
                  setNewParamName('');
                }
              }}
              autoFocus
            />
            <button
              onClick={() => handleAddParameter(newParamName)}
              className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {t('parameterEditor.add')}
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewParamName('');
              }}
              className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50"
            >
              {t('confirm.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* 파라미터 목록 */}
      {parameters.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">📝</div>
          <p>{t('parameterEditor.noParameters')}</p>
          <p className="text-sm">{t('parameterEditor.autoDetect')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {parameters.map((param, index) => (
            <div
              key={param.name}
              className="p-4 bg-white border border-gray-200 rounded-lg"
            >
              {editingParam === param.name ? (
                // 편집 모드
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('parameterEditor.name')}
                      </label>
                      <input
                        type="text"
                        value={param.name}
                        onChange={(e) => handleUpdateParameter(index, { name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        타입
                      </label>
                      <select
                        value={param.type}
                        onChange={(e) => handleUpdateParameter(index, { 
                          type: e.target.value as 'string' | 'category',
                          options: e.target.value === 'string' ? undefined : param.options || []
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="string">{t('parameterEditor.string')}</option>
                        <option value="category">{t('parameterEditor.select')}</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('parameterEditor.descriptionLabel')}
                    </label>
                    <input
                      type="text"
                      value={param.description || ''}
                      onChange={(e) => handleUpdateParameter(index, { description: e.target.value })}
                      placeholder={t('parameterEditor.paramDescPlaceholder')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {param.type === 'category' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('parameterEditor.selectOptions')}
                      </label>
                      <div className="space-y-2">
                        {/* 기존 옵션들 */}
                        {(param.options || []).map((option, optionIndex) => (
                          <div key={optionIndex} className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={option}
                              onChange={(e) => {
                                const newOptions = [...(param.options || [])];
                                newOptions[optionIndex] = e.target.value;
                                handleUpdateParameter(index, { options: newOptions.filter(s => s.trim()) });
                              }}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder={t('parameterEditor.optionPlaceholder', { index: optionIndex + 1 })}
                            />
                            <button
                              onClick={() => {
                                const newOptions = [...(param.options || [])];
                                newOptions.splice(optionIndex, 1);
                                handleUpdateParameter(index, { options: newOptions });
                              }}
                              className="p-2 text-red-600 hover:text-red-800"
                              title={t('parameterEditor.deleteOption')}
                            >
                              🗑️
                            </button>
                          </div>
                        ))}
                        
                        {/* 새 옵션 추가 */}
                        <button
                          onClick={() => {
                            const newOptions = [...(param.options || []), ''];
                            handleUpdateParameter(index, { options: newOptions });
                          }}
                          className="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-md text-gray-500 hover:border-gray-400 hover:text-gray-600"
                        >
                          {t('parameterEditor.addOption')}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id={`required-${index}`}
                      checked={param.required}
                      onChange={(e) => handleUpdateParameter(index, { required: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor={`required-${index}`} className="ml-2 text-sm text-gray-700">
                      {t('parameterEditor.requiredParam')}
                    </label>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => setEditingParam(null)}
                      className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      {t('parameterEditor.done')}
                    </button>
                  </div>
                </div>
              ) : (
                // 보기 모드
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                        {`{{${param.name}}}`}
                      </span>
                      <span className="text-sm text-gray-600">
                        {param.type === 'string' ? t('parameterEditor.string') : t('parameterEditor.select')}
                      </span>
                      {param.required && (
                        <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                          {t('parameterEditor.required')}
                        </span>
                      )}
                    </div>
                    {param.description && (
                      <p className="text-sm text-gray-600 mt-1">{param.description}</p>
                    )}
                    {param.type === 'category' && param.options && param.options.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {param.options.map(option => (
                          <span
                            key={option}
                            className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded"
                          >
                            {option}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleMoveParameter(index, 'up')}
                      disabled={index === 0}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                      title={t('parameterEditor.moveUp')}
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => handleMoveParameter(index, 'down')}
                      disabled={index === parameters.length - 1}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                      title={t('parameterEditor.moveDown')}
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => setEditingParam(param.name)}
                      className="p-1 text-blue-600 hover:text-blue-800"
                      title={t('parameterEditor.edit')}
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDeleteParameter(index)}
                      className="p-1 text-red-600 hover:text-red-800"
                      title={t('parameterEditor.delete')}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
