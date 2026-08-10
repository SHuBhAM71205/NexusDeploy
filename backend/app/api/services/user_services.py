from enum import Enum
from typing import List, Tuple, Union, Literal

from sqlalchemy import select, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.User import User


class UserLookupField(str, Enum):
    ID = "id"
    EMAIL = "email"
    USERNAME = "name"


class UserServices:

    def __init__(self) -> None:
        pass

    async def find_user_by(
            self,
            key_value: List[Tuple[UserLookupField, Union[str, int]]],
            db: AsyncSession,
            operator: Literal["AND", "OR"] = "AND"  # Defaults to AND if not specified
    ) -> User | None:
        """
        Finds a user matching criteria using either explicit AND or logic.
        Example:
            await find_user_by([(UserLookupField.USERNAME, "john"), (UserLookupField.EMAIL, "john@test.com")], db, operator="OR")
        """

        if not key_value:
            return None

        conditions = []
        for key, value in key_value:
            column_attr = getattr(User, key.value)
            conditions.append(column_attr == value)

        if operator == "AND":
            final_filter = and_(*conditions)
        elif operator == "OR":
            final_filter = or_(*conditions)
        else:
            raise ValueError("Operator must be either 'AND' or 'OR'")

        # 4. Execute the query
        stmt = select(User).where(final_filter)
        result = await db.execute(stmt)

        return result.scalars().first()
