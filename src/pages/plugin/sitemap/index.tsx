import React, { useEffect, useState } from 'react';
import ProForm, {
  ProFormRadio,
  ProFormText,
  ProFormInstance,
  ProFormSelect,
} from '@ant-design/pro-form';
import { PageHeaderWrapper } from '@ant-design/pro-layout';
import { Alert, Button, Card, message, Space } from 'antd';
import { pluginBuildSitemap, pluginGetSitemap, pluginSaveSitemap } from '@/services/plugin/sitemap';
import moment from 'moment';
import { getCategories, getModules } from '@/services';

const PluginSitemap: React.FC<any> = (props) => {
  const formRef = React.createRef<ProFormInstance>();
  const [sitemapSetting, setSitemapSetting] = useState<any>({});
  const [fetched, setFetched] = useState<boolean>(false);

  const getSetting = async () => {
    const res = await pluginGetSitemap();
    let setting = res.data || {};
    setSitemapSetting(setting);
    setFetched(true);
  };

  useEffect(() => {
    getSetting();
  }, []);

  const onSubmit = async (values: any) => {
    const hide = message.loading('正在提交中', 0);
    pluginSaveSitemap(values)
      .then((res) => {
        message.success(res.msg);
      })
      .catch((err) => {
        console.log(err);
      })
      .finally(() => {
        hide();
      });
  };

  const rebuildSitemap = () => {
    let values = formRef.current?.getFieldsValue();
    const hide = message.loading('正在提交中', 0);
    pluginBuildSitemap(values)
      .then((res) => {
        message.info(res.msg);
        if (res.code === 0) {
          setSitemapSetting(res.data);
        }
      })
      .finally(() => {
        hide();
      });
  };

  return (
    <PageHeaderWrapper>
      <Card>
        <Alert
          message={
            <div>
              <div>
                现在各大搜索引擎的sitemap提交，都已支持txt格式的sitemap，并且txt的sitemap文件大小相比于xml的sitemap文件更小，因此建议使用
                txt格式的Sitemap。
              </div>
              <div>
                由于各个搜索引擎的sitemap提交，都限制了5万条或10M大小，因此本sitemap功能，将按照5万条一个sitemap文件的数量生成。
              </div>
            </div>
          }
        />
        {fetched && (
          <div className="mt-normal">
            <ProForm onFinish={onSubmit} initialValues={sitemapSetting} formRef={formRef}>
              <Card size="small" title="Sitemap设置" bordered={false}>
                <ProFormRadio.Group
                  name="type"
                  label="Sitemap格式"
                  options={[
                    { value: 'txt', label: 'txt' },
                    { value: 'xml', label: 'xml' },
                  ]}
                />
                <ProFormRadio.Group
                  name="auto_build"
                  label="Sitemap生成方法"
                  options={[
                    { value: 0, label: '手动' },
                    { value: 1, label: '自动' },
                  ]}
                />
                <ProFormRadio.Group
                  name="exclude_tag"
                  label="文档标签生成Sitemap"
                  options={[
                    { value: false, label: '生成' },
                    { value: true, label: '不生成' },
                  ]}
                />
                <ProFormSelect
                  name={'exclude_module_ids'}
                  label="排除的文档模型"
                  mode="multiple"
                  request={async () => {
                    let res = await getModules({});
                    const tmpModules = (res.data || []).map((item: any) => ({
                      label: item.title,
                      value: item.id,
                    }));
                    return tmpModules;
                  }}
                  placeholder={'如果你想排除某些文档模型，可以在这里选择'}
                />
                <ProFormSelect
                  name={'exclude_category_ids'}
                  label="排除的分类"
                  mode="multiple"
                  request={async () => {
                    let res = await getCategories({ type: 1 });
                    const tmpData = (res.data || []).map((item: any) => ({
                      label: item.spacer.replaceAll('&nbsp;', ' ') + item.title,
                      value: item.id,
                    }));
                    return tmpData;
                  }}
                  placeholder={'如果你想排除某些分类，可以在这里选择'}
                />
                <ProFormSelect
                  name={'exclude_page_ids'}
                  label="排除的单页"
                  mode="multiple"
                  request={async () => {
                    let res = await getCategories({ type: 3 });
                    const tmpData = (res.data || []).map((item: any) => ({
                      label: item.spacer.replaceAll('&nbsp;', ' ') + item.title,
                      value: item.id,
                    }));
                    return tmpData;
                  }}
                  placeholder={'如果你想排除某些单页，可以在这里选择'}
                />
              </Card>
            </ProForm>
            <div className="mt-normal">
              <Card size="small" title="手动操作" bordered={false}>
                <div>提示：修改Sitemap配置后，请手动生成Sitemap，让配置生效。</div>
                <ProFormText
                  readonly
                  label="上次生成时间"
                  fieldProps={{
                    value: moment(sitemapSetting.updated_time * 1000).format('YYYY-MM-DD HH:mm'),
                  }}
                />
                <Space size={20}>
                  <Button
                    type="primary"
                    onClick={() => {
                      rebuildSitemap();
                    }}
                  >
                    手动生成Sitemap
                  </Button>
                  <Button
                    onClick={() => {
                      window.open(sitemapSetting.sitemap_url);
                    }}
                  >
                    查看Sitemap
                  </Button>
                </Space>
              </Card>
            </div>
          </div>
        )}
      </Card>
    </PageHeaderWrapper>
  );
};

export default PluginSitemap;
