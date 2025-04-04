import { getCategories } from '@/services/category';
import { pluginSaveKeyword } from '@/services/plugin/keyword';
import { ModalForm, ProFormSelect, ProFormText, ProFormTextArea } from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import { message } from 'antd';
import React, { useState } from 'react';

export type KeywordFormProps = {
  onCancel: (flag?: boolean) => void;
  onSubmit: (flag?: boolean) => Promise<void>;
  open: boolean;
  editingKeyword: any;
};

const KeywordForm: React.FC<KeywordFormProps> = (props) => {
  const [loading, setLoading] = useState(false);
  const intl = useIntl();
  const onSubmit = async (values: any) => {
    if (loading) return;
    setLoading(true);
    const hide = message.loading({
      content: intl.formatMessage({ id: 'setting.system.submitting' }),
      key: "loading"
    }, 0);
    let editingKeyword = Object.assign(props.editingKeyword, values);
    await pluginSaveKeyword(editingKeyword);
    hide();
    setLoading(false);
    props.onSubmit();
  };

  return (
    <ModalForm
      width={800}
      title={props.editingKeyword?.id ? intl.formatMessage({ id: 'plugin.keyword.edit' }) : intl.formatMessage({ id: 'plugin.keyword.add' })}
      initialValues={props.editingKeyword}
      open={props.open}
      //layout="horizontal"
      onOpenChange={(flag) => {
        if (!flag) {
          props.onCancel(flag);
        }
      }}
      onFinish={async (values) => {
        onSubmit(values);
      }}
    >
      {props.editingKeyword?.id > 0 ? (
        <ProFormText name="title" label={intl.formatMessage({ id: 'plugin.keyword.title' })} />
      ) : (
        <ProFormTextArea
          fieldProps={{
            rows: 5,
          }}
          name="title"
          label={intl.formatMessage({ id: 'plugin.keyword.title' })}
          placeholder={intl.formatMessage({ id: 'plugin.keyword.title.placeholder' })}
        />
      )}
      <ProFormSelect
        label={intl.formatMessage({ id: 'plugin.keyword.archive-category' })}
        name="category_id"
        width="lg"
        request={async () => {
          let res = await getCategories({ type: 1 });
          return res.data || [];
        }}
        fieldProps={{
          fieldNames: {
            label: 'title',
            value: 'id',
          },
          optionItemRender(item: any) {
            return <div dangerouslySetInnerHTML={{ __html: item.spacer + item.title }}></div>;
          },
        }}
      />
    </ModalForm>
  );
};

export default KeywordForm;
