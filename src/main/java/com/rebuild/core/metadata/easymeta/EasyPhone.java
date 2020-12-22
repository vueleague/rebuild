/*
Copyright (c) REBUILD <https://getrebuild.com/> and/or its owners. All rights reserved.

rebuild is dual-licensed under commercial and open source licenses (GPLv3).
See LICENSE and COMMERCIAL in the project root for license information.
*/

package com.rebuild.core.metadata.easymeta;

import cn.devezhao.persist4j.Field;
import com.rebuild.core.support.ConfigurationItem;
import com.rebuild.core.support.RebuildConfiguration;
import com.rebuild.utils.CommonsUtils;

/**
 * @author devezhao
 * @since 2020/11/17
 */
public class EasyPhone extends EasyField {
    private static final long serialVersionUID = 347745040979570855L;

    protected EasyPhone(Field field, DisplayType displayType) {
        super(field, displayType);
    }

    @Override
    public Object wrapValue(Object value) {
        Object phone = super.wrapValue(value);
        if (RebuildConfiguration.getBool(ConfigurationItem.DataMasking)) {
            if (phone == null) return null;
            else return CommonsUtils.starsPhone((String) phone);
        } else {
            return phone;
        }
    }
}
