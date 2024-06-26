import { PlusOutlined } from '@ant-design/icons';
import { Button, message, Modal, Space } from 'antd';
import React, { useState, useRef } from 'react';
import { PageContainer } from '@ant-design/pro-layout';
import type { ProColumns, ActionType } from '@ant-design/pro-table';
import ProTable from '@ant-design/pro-table';
import {
  pluginDeleteAnchor,
  pluginExportAnchor,
  pluginGetAnchors,
  pluginReplaceAnchor,
} from '@/services/plugin/anchor';
import AnchorForm from './components/anchorForm';
import AnchorSetting from './components/setting';
import { exportFile } from '@/utils';
import AnchorImport from './components/import';
import './index.less';

const PluginAnchor: React.FC = () => {
  const actionRef = useRef<ActionType>();
  const [selectedRowKeys, setSelectedRowKeys] = useState<any[]>([]);
  const [currentAnchor, setCurrentAnchor] = useState<any>({});
  const [editVisible, setEditVisible] = useState<boolean>(false);

  const handleRemove = async (selectedRowKeys: any[]) => {
    Modal.confirm({
      title: '确定要删除选中的锚文本吗？',
      onOk: async () => {
        const hide = message.loading('正在删除', 0);
        if (!selectedRowKeys) return true;
        try {
          for (let item of selectedRowKeys) {
            await pluginDeleteAnchor({
              id: item,
            });
          }
          hide();
          message.success('删除成功');
          setSelectedRowKeys([]);
          actionRef.current?.reloadAndRest?.();
          return true;
        } catch (error) {
          hide();
          message.error('删除失败');
          return true;
        }
      },
    });
  };

  const handleEditAnchor = async (record: any) => {
    setCurrentAnchor(record);
    setEditVisible(true);
  };

  const handleReplaceAnchor = async (record: any) => {
    let res = await pluginReplaceAnchor(record);
    message.info(res.msg);
    if (actionRef.current) {
      actionRef.current.reload();
    }
  };

  const handleExportAnchor = async () => {
    let res = await pluginExportAnchor();

    exportFile(res.data?.header, res.data?.content, 'csv');
  };

  const columns: ProColumns<any>[] = [
    {
      title: 'ID',
      hideInSearch: true,
      dataIndex: 'id',
    },
    {
      title: '锚文本',
      dataIndex: 'title',
      fieldProps(form, config) {
        return {
          placeholder: '搜索锚文本或锚文本链接',
        };
      },
    },
    {
      title: '锚文本链接',
      hideInSearch: true,
      dataIndex: 'link',
    },
    {
      title: '权重',
      hideInSearch: true,
      dataIndex: 'weight',
    },
    {
      title: '替换次数',
      hideInSearch: true,
      dataIndex: 'replace_count',
    },
    {
      title: '操作',
      dataIndex: 'option',
      valueType: 'option',
      render: (_, record) => (
        <Space size={20}>
          <a
            key="check"
            onClick={() => {
              handleReplaceAnchor(record);
            }}
          >
            替换
          </a>
          <a
            key="edit"
            onClick={() => {
              handleEditAnchor(record);
            }}
          >
            编辑
          </a>
          <a
            className="text-red"
            key="delete"
            onClick={() => {
              handleRemove([record.id]);
            }}
          >
            删除
          </a>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer>
      <ProTable<any>
        headerTitle="锚文本管理"
        actionRef={actionRef}
        rowKey="id"
        toolBarRender={() => [
          <Button
            type="primary"
            key="add"
            onClick={() => {
              handleEditAnchor({});
            }}
          >
            <PlusOutlined /> 添加锚文本
          </Button>,
          <Button
            key="export"
            onClick={() => {
              handleExportAnchor();
            }}
          >
            导出锚文本
          </Button>,
          <AnchorImport
            onCancel={() => {
              actionRef.current?.reloadAndRest?.();
            }}
          >
            <Button
              key="import"
              onClick={() => {
                //todo
              }}
            >
              导入锚文本
            </Button>
          </AnchorImport>,
          <Button
            key="update"
            onClick={() => {
              handleReplaceAnchor({});
            }}
          >
            批量更新锚文本
          </Button>,
          <AnchorSetting>
            <Button
              key="setting"
              onClick={() => {
                //todo
              }}
            >
              锚文本设置
            </Button>
          </AnchorSetting>,
        ]}
        tableAlertOptionRender={({ selectedRowKeys, onCleanSelected }) => (
          <Space>
            <Button
              size={'small'}
              onClick={() => {
                handleRemove(selectedRowKeys);
              }}
            >
              批量删除
            </Button>
            <Button type="link" size={'small'} onClick={onCleanSelected}>
              取消选择
            </Button>
          </Space>
        )}
        request={(params) => {
          return pluginGetAnchors(params);
        }}
        columnsState={{
          persistenceKey: 'anchor-table',
          persistenceType: 'localStorage',
        }}
        columns={columns}
        rowSelection={{
          onChange: (selectedRowKeys) => {
            setSelectedRowKeys(selectedRowKeys);
          },
        }}
        pagination={{
          showSizeChanger: true,
        }}
      />
      {editVisible && (
        <AnchorForm
          visible={editVisible}
          editingAnchor={currentAnchor}
          onCancel={() => {
            setEditVisible(false);
          }}
          onSubmit={async () => {
            setEditVisible(false);
            if (actionRef.current) {
              actionRef.current.reload();
            }
          }}
        />
      )}
    </PageContainer>
  );
};

export default PluginAnchor;
