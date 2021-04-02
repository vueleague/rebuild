/*
Copyright (c) REBUILD <https://getrebuild.com/> and/or its owners. All rights reserved.

rebuild is dual-licensed under commercial and open source licenses (GPLv3).
See LICENSE and COMMERCIAL in the project root for license information.
*/

package com.rebuild.core.service.trigger.impl;

import cn.devezhao.commons.ObjectUtils;
import cn.devezhao.persist4j.Field;
import cn.devezhao.persist4j.Record;
import cn.devezhao.persist4j.record.RecordVisitor;
import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import com.rebuild.core.Application;
import com.rebuild.core.configuration.general.AutoFillinManager;
import com.rebuild.core.metadata.MetadataHelper;
import com.rebuild.core.metadata.easymeta.DisplayType;
import com.rebuild.core.metadata.easymeta.EasyDateTime;
import com.rebuild.core.metadata.easymeta.EasyField;
import com.rebuild.core.metadata.easymeta.EasyMetaFactory;
import com.rebuild.core.service.trigger.ActionContext;
import com.rebuild.core.service.trigger.ActionType;
import com.rebuild.utils.CommonsUtils;
import org.apache.commons.lang.StringUtils;
import org.springframework.util.Assert;

import java.util.HashSet;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Matcher;

/**
 * 数据转写（自动更新）
 *
 * @author devezhao
 * @see AutoFillinManager
 * @since 2020/2/7
 */
public class FieldWriteback extends FieldAggregation {

    private static final String DATE_EXPR = "#";

    public FieldWriteback(ActionContext context) {
        super(context);
    }

    @Override
    public ActionType getType() {
        return ActionType.FIELDWRITEBACK;
    }

    @Override
    protected void buildTargetRecord(Record record, String dataFilterSql) {
        final JSONArray items = ((JSONObject) context.getActionContent()).getJSONArray("items");

        Set<String> fieldVars = new HashSet<>();
        for (Object o : items) {
            JSONObject item = (JSONObject) o;
            String sourceField = item.getString("sourceField");
            String updateMode = item.getString("updateMode");
            // fix: v2.2
            if (updateMode == null) {
                updateMode = sourceField.contains(DATE_EXPR) ? "FORMULA" : "FIELD";
            }

            if ("FIELD".equalsIgnoreCase(updateMode)) {
                fieldVars.add(sourceField);
            } else if ("FORMULA".equalsIgnoreCase(updateMode)) {
                if (sourceField.contains(DATE_EXPR)) {
                    fieldVars.add(sourceField.split(DATE_EXPR)[0]);
                } else {
                    Matcher m = FieldAggregation.PATT_FIELD.matcher(sourceField);
                    while (m.find()) {
                        String field = m.group(1);
                        if (MetadataHelper.getLastJoinField(sourceEntity, field) != null) {
                            fieldVars.add(field);
                        }
                    }
                }
            }
        }

        // 变量值
        Record useSourceData = null;
        if (!fieldVars.isEmpty()) {
            String sql = String.format("select %s from %s where %s = '%s'",
                    StringUtils.join(fieldVars, ","), sourceEntity.getName(),
                    sourceEntity.getPrimaryField().getName(), context.getSourceRecord());
            useSourceData = Application.createQueryNoFilter(sql).record();
        }

        for (Object o : items) {
            JSONObject item = (JSONObject) o;
            String targetField = item.getString("targetField");
            if (!MetadataHelper.checkAndWarnField(targetEntity, targetField)) {
                continue;
            }

            EasyField targetFieldEasy = EasyMetaFactory.valueOf(targetEntity.getField(targetField));

            String updateMode = item.getString("updateMode");
            String sourceField = item.getString("sourceField");

            // 置空
            if ("VNULL".equalsIgnoreCase(updateMode)) {
                record.setNull(targetField);
            }

            // 固定值
            else if ("VFIXED".equalsIgnoreCase(updateMode)) {
                RecordVisitor.setValueByLiteral(targetField, sourceField, record);
            }

            // 字段
            else if ("FIELD".equalsIgnoreCase(updateMode)) {
                Field sourceField2 = MetadataHelper.getLastJoinField(sourceEntity, sourceField);
                if (sourceField2 == null) continue;

                Object value = Objects.requireNonNull(useSourceData).getObjectValue(sourceField);
                Object newValue = value == null ? null : EasyMetaFactory.valueOf(sourceField2)
                        .convertCompatibleValue(value, targetFieldEasy);
                if (newValue != null) {
                    record.setObjectValue(targetField, newValue);
                }
            }

            // 公式
            else if ("FORMULA".equalsIgnoreCase(updateMode)) {
                Assert.notNull(useSourceData, "[useSourceData] not be null");

                // 日期
                if (sourceField.contains(DATE_EXPR)) {
                    String fieldName = sourceField.split(DATE_EXPR)[0];
                    Field sourceField2 = MetadataHelper.getLastJoinField(sourceEntity, fieldName);
                    if (sourceField2 == null) continue;

                    Object value = useSourceData.getObjectValue(fieldName);
                    Object newValue = value == null ? null : ((EasyDateTime) EasyMetaFactory.valueOf(sourceField2))
                            .convertCompatibleValue(value, targetFieldEasy, sourceField);
                    if (newValue != null) {
                        record.setObjectValue(targetField, newValue);
                    }
                }

                // 数字
                else {
                    String realFormual = sourceField.toUpperCase()
                            .replace("×", "*")
                            .replace("÷", "/");
                    for (String fieldName : useSourceData.getAvailableFields()) {
                        String replace = "{" + fieldName.toUpperCase() + "}";
                        if (realFormual.contains(replace)) {
                            Object value = useSourceData.getObjectValue(fieldName);
                            realFormual = realFormual.replace(replace, value == null ? "0" : value.toString());
                        }
                    }

                    Object newValue = AggregationEvaluator.calc(realFormual);
                    if (newValue != null) {
                        DisplayType dt = targetFieldEasy.getDisplayType();
                        if (dt == DisplayType.NUMBER) {
                            record.setLong(targetField, CommonsUtils.toLongHalfUp(newValue));
                        } else if (dt == DisplayType.DECIMAL) {
                            record.setDouble(targetField, ObjectUtils.toDouble(newValue));
                        }
                    }
                }
            }
        }
    }
}
